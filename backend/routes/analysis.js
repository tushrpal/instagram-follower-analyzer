const express = require("express");
const { database } = require("../models/database");
const path = require("path");
const fs = require("fs").promises;
const requireAuth = require("../middleware/requireAuth");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

// Allow unauthenticated access by default; individual routes enforce auth where needed
router.use(optionalAuth);

// Add input validation middleware
const validateSessionId = (req, res, next) => {
  const { sessionId } = req.params;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Invalid session ID" });
  }
  next();
};

const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }
  req.pagination = { page, limit };
  next();
};

const validateAnalysisData = (req, res, next) => {
  const { followers, following } = req.body;
  if (!Array.isArray(followers) || !Array.isArray(following)) {
    return res.status(400).json({ error: "Invalid data format" });
  }
  next();
};

// Session history - list all past sessions (must be before /:sessionId routes)
router.get("/", requireAuth, async (req, res) => {
  try {
    const sessions = await database.getAnalysisSessions(50, req.session.userId);
    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name || null,
        createdAt: s.created_at,
        processedAt: s.processed_at,
        followersCount: s.followers_count,
        followingCount: s.following_count,
        mutualCount: s.mutual_count,
        followersOnlyCount: s.followers_only_count,
        followingOnlyCount: s.following_only_count,
      })),
    });
  } catch (error) {
    console.error("Session history error:", error);
    res.status(500).json({ error: "Failed to fetch session history" });
  }
});

// Session comparison (must be before /:sessionId routes)
router.get("/compare", async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) return res.status(400).json({ error: "Both session IDs (a, b) are required" });

    const [sessionA, sessionB] = await Promise.all([
      database.getAnalysis(a),
      database.getAnalysis(b),
    ]);

    if (!sessionA || !sessionB) {
      return res.status(404).json({ error: "One or both sessions not found" });
    }

    const [usersA, usersB] = await Promise.all([
      database.getUsers(a),
      database.getUsers(b),
    ]);

    const hrefA = new Map(usersA.map((u) => [u.username, u.href]));
    const hrefB = new Map(usersB.map((u) => [u.username, u.href]));

    const setA = {
      followers: new Set(usersA.filter((u) => u.category !== "following_only").map((u) => u.username)),
      following: new Set(usersA.filter((u) => u.category !== "followers_only").map((u) => u.username)),
    };
    const setB = {
      followers: new Set(usersB.filter((u) => u.category !== "following_only").map((u) => u.username)),
      following: new Set(usersB.filter((u) => u.category !== "followers_only").map((u) => u.username)),
    };

    const toUserObj = (username, mapB, mapA) => ({
      username,
      href: mapB.get(username) || mapA.get(username) || null,
    });

    const diff = {
      newFollowers: [...setB.followers].filter((u) => !setA.followers.has(u)).map((u) => toUserObj(u, hrefB, hrefA)),
      lostFollowers: [...setA.followers].filter((u) => !setB.followers.has(u)).map((u) => toUserObj(u, hrefA, hrefB)),
      newFollowing: [...setB.following].filter((u) => !setA.following.has(u)).map((u) => toUserObj(u, hrefB, hrefA)),
      removedFollowing: [...setA.following].filter((u) => !setB.following.has(u)).map((u) => toUserObj(u, hrefA, hrefB)),
    };

    res.json({
      sessionA: { id: a, createdAt: sessionA.created_at, name: sessionA.name || null, followersCount: sessionA.followers_count, followingCount: sessionA.following_count, mutualCount: sessionA.mutual_count },
      sessionB: { id: b, createdAt: sessionB.created_at, name: sessionB.name || null, followersCount: sessionB.followers_count, followingCount: sessionB.following_count, mutualCount: sessionB.mutual_count },
      diff,
      summary: {
        newFollowersCount: diff.newFollowers.length,
        lostFollowersCount: diff.lostFollowers.length,
        newFollowingCount: diff.newFollowing.length,
        removedFollowingCount: diff.removedFollowing.length,
      },
    });
  } catch (error) {
    console.error("Compare error:", error);
    res.status(500).json({ error: "Failed to compare sessions" });
  }
});

// Rename a session
router.patch("/:sessionId/name", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;
    if (typeof name !== "string") {
      return res.status(400).json({ error: "name must be a string" });
    }
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) return res.status(404).json({ error: "Analysis session not found" });
    await database.updateSessionName(sessionId, name.trim().slice(0, 120));
    res.json({ success: true });
  } catch (error) {
    console.error("Rename session error:", error);
    res.status(500).json({ error: "Failed to rename session" });
  }
});

// Unfollow candidates — following_only sorted by oldest-followed-first
router.get("/:sessionId/unfollow-candidates", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) return res.status(404).json({ error: "Analysis session not found" });

    const { rows } = await database.queryRaw(
      `SELECT u.username, u.href,
              fe.event_timestamp as followed_at
       FROM users u
       LEFT JOIN follower_events fe
         ON fe.session_id = u.session_id AND fe.username = u.username AND fe.direction = 'following'
       WHERE u.session_id = $1 AND u.category = 'following_only'
       ORDER BY fe.event_timestamp ASC NULLS LAST, u.username ASC`,
      [sessionId]
    );

    res.json({ candidates: rows });
  } catch (error) {
    console.error("Unfollow candidates error:", error);
    res.status(500).json({ error: "Failed to fetch unfollow candidates" });
  }
});

// Get pending follow requests
router.get(
  "/:sessionId/pending-requests",
  validateSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      // First check if session exists
      const analysis = await database.getAnalysis(sessionId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis session not found" });
      }

      // Get both pending requests and following users
      const [pendingRequests, followingUsers, mutualUsers] = await Promise.all([
        database.getPendingRequests(sessionId),
        database.getUsers(sessionId, "following_only"),
        database.getUsers(sessionId, "mutual"),
      ]);

      // Create a set of usernames that you're following (both mutual and following_only)
      const followingUsernames = new Set([
        ...followingUsers.map((user) => user.username),
        ...mutualUsers.map((user) => user.username),
      ]);

      // Filter out pending requests for users you already follow
      const filteredRequests = pendingRequests.filter(
        (request) => !followingUsernames.has(request.username)
      );

      res.json({
        sessionId,
        pendingRequests: filteredRequests.map((request) => ({
          username: request.username,
          profileUrl: request.profile_url,
          requestDate: request.request_date,
          status: request.status,
        })),
        summary: {
          totalCount: filteredRequests.length,
          filteredCount: pendingRequests.length - filteredRequests.length,
        },
      });
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ error: "Failed to fetch pending requests" });
    }
  }
);

// 1. Analysis Summary Route
router.get("/:sessionId", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analysis = await database.getAnalysis(sessionId);

    if (!analysis) {
      return res.status(404).json({ error: "Analysis session not found" });
    }

    const [unfollowedCount, relationshipCounts] = await Promise.all([
      database.getUnfollowedCount(sessionId),
      database.getRelationshipProfileCounts(sessionId),
    ]);

    res.json({
      sessionId: analysis.id,
      createdAt: analysis.created_at,
      processedAt: analysis.processed_at,
      summary: {
        totalFollowers: analysis.followers_count,
        totalFollowing: analysis.following_count,
        mutualCount: analysis.mutual_count,
        followersOnlyCount: analysis.followers_only_count,
        followingOnlyCount: analysis.following_only_count,
        unfollowedCount,
      },
      relationshipCounts,
    });
  } catch (error) {
    console.error("Analysis retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve analysis" });
  }
});

// 2. Timeline Route
router.get("/:sessionId/timeline", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { timeframe = "all" } = req.query;

    // Validate timeframe
    const validTimeframes = ["all", "week", "month", "year"];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        error: `Invalid timeframe. Must be one of: ${validTimeframes.join(
          ", "
        )}`,
      });
    }

    // First check if session exists
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis session not found" });
    }

    // Get timeline data
    const timelineData = await database.getTimelineData(sessionId);

    // Add debug logging
    // console.log("Raw Timeline Data:", JSON.stringify(timelineData, null, 2));

    // Even if we have no events, return empty structure rather than 404
    const baseResponse = {
      timelineData: {
        followEvents: [],
        statistics: {
          totalFollowers: 0,
          totalFollowing: 0,
        },
      },
      statistics: {
        dailyGrowth: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
      },
    };

    if (!timelineData || !timelineData.followEvents) {
      return res.json(baseResponse);
    }

    // Filter data based on timeframe
    const filteredData = filterTimelineData(timelineData, timeframe);

    // Calculate growth statistics
    const stats = calculateGrowthStats(filteredData.followEvents);

    res.json({
      timelineData: filteredData,
      statistics: stats,
    });
  } catch (error) {
    console.error("Timeline data retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve timeline data" });
  }
});

// Add this helper function
function calculateGrowthStats(events) {
  if (!events || events.length === 0) {
    return {
      dailyGrowth: 0,
      weeklyGrowth: 0,
      monthlyGrowth: 0,
    };
  }

  const now = new Date();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  return {
    dailyGrowth: calculateGrowthForPeriod(events, dayAgo),
    weeklyGrowth: calculateGrowthForPeriod(events, weekAgo),
    monthlyGrowth: calculateGrowthForPeriod(events, monthAgo),
  };
}

function calculateGrowthForPeriod(events, startDate) {
  return events
    .filter((event) => new Date(event.timestamp) >= startDate)
    .reduce((acc, event) => {
      return acc + (event.direction === "follower" ? 1 : -1);
    }, 0);
}

// 3. Export Route
router.get("/:sessionId/export", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { category } = req.query;

    let users;
    let filename;

    if (
      category &&
      ["mutual", "followers_only", "following_only"].includes(category)
    ) {
      users = await database.getUsers(sessionId, category);
      filename = `instagram_${category}_${sessionId.slice(0, 8)}.csv`;
    } else {
      // Export all users
      const mutual = await database.getUsers(sessionId, "mutual");
      const followersOnly = await database.getUsers(
        sessionId,
        "followers_only"
      );
      const followingOnly = await database.getUsers(
        sessionId,
        "following_only"
      );

      users = [
        ...mutual.map((u) => ({ ...u, category: "Mutual" })),
        ...followersOnly.map((u) => ({ ...u, category: "Followers Only" })),
        ...followingOnly.map((u) => ({ ...u, category: "Following Only" })),
      ];
      filename = `instagram_analysis_${sessionId.slice(0, 8)}.csv`;
    }

    // Generate CSV
    const csvHeader = "Username,Category,Profile URL\n";
    const csvRows = users
      .map(
        (user) => `"${user.username}","${user.category}","${user.href || ""}"`
      )
      .join("\n");

    const csv = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

// Get list of unfollowed profiles
router.get("/:sessionId/unfollowed", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Changed default to 20
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    console.log("API route debug:", {
      originalQuery: req.query,
      page,
      limit,
      search,
      offset,
    });

    // First check if session exists
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis session not found" });
    }

    const profiles = await database.getUnfollowedProfiles(
      sessionId,
      limit,
      offset,
      search
    );

    // Get total count for pagination
    const totalCount = await database.getUnfollowedProfilesCount(
      sessionId,
      search
    );

    console.log("Unfollowed profiles debug:", {
      sessionId,
      page: parseInt(page),
      limit: parseInt(limit),
      offset,
      search,
      profilesCount: profiles.length,
      totalCount,
      firstProfile: profiles[0],
    });

    res.json({
      success: true,
      data: profiles,
      pagination: {
        page: page,
        limit: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      search: search || null,
    });
  } catch (error) {
    console.error("Error fetching unfollowed profiles:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch unfollowed profiles",
    });
  }
});

// Relationship profiles - counts per list type
router.get("/:sessionId/relationships", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) return res.status(404).json({ error: "Analysis session not found" });

    const counts = await database.getRelationshipProfileCounts(sessionId);
    res.json({ sessionId, counts });
  } catch (error) {
    console.error("Relationships error:", error);
    res.status(500).json({ error: "Failed to fetch relationship data" });
  }
});

// Relationship profiles - paginated list for a specific list type
router.get("/:sessionId/relationships/:listType", validateSessionId, async (req, res) => {
  try {
    const { sessionId, listType } = req.params;
    const validTypes = [
      "close_friend", "blocked", "hidden_story", "restricted",
      "favorited", "removed_suggestion", "received_request", "recent_request",
    ];
    if (!validTypes.includes(listType)) {
      return res.status(400).json({ error: "Invalid list type" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || null;
    const offset = (page - 1) * limit;

    const [profiles, totalCount] = await Promise.all([
      database.getRelationshipProfiles(sessionId, listType, limit, offset, search),
      database.getRelationshipProfileCount(sessionId, listType, search),
    ]);

    res.json({
      profiles,
      pagination: {
        page, limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Relationship list error:", error);
    res.status(500).json({ error: "Failed to fetch relationship profiles" });
  }
});

// Cross-reference insights
router.get("/:sessionId/insights", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const analysis = await database.getAnalysis(sessionId);
    if (!analysis) return res.status(404).json({ error: "Analysis session not found" });

    const insights = await database.queryRaw(
      `WITH followers AS (
          SELECT username FROM users WHERE session_id = $1 AND category IN ('mutual', 'followers_only')
        ),
        following AS (
          SELECT username FROM users WHERE session_id = $2 AND category IN ('mutual', 'following_only')
        ),
        mutual AS (
          SELECT username FROM users WHERE session_id = $3 AND category = 'mutual'
        )
        SELECT
          rp.list_type,
          rp.username,
          rp.display_name,
          rp.profile_url,
          rp.timestamp,
          CASE WHEN f.username IS NOT NULL THEN 1 ELSE 0 END as is_follower,
          CASE WHEN fw.username IS NOT NULL THEN 1 ELSE 0 END as is_following,
          CASE WHEN m.username IS NOT NULL THEN 1 ELSE 0 END as is_mutual
        FROM relationship_profiles rp
        LEFT JOIN followers f ON f.username = rp.username
        LEFT JOIN following fw ON fw.username = rp.username
        LEFT JOIN mutual m ON m.username = rp.username
        WHERE rp.session_id = $4`,
      [sessionId, sessionId, sessionId, sessionId]
    );

    const result = {
      closeFriendsNotFollowingBack: [],
      closeFriendsYouDontFollow: [],
      blockedStillInFollowers: [],
      hiddenStoryMutual: [],
      requestConversions: [],
      receivedNotAccepted: [],
      removedSuggestionsNowFollowing: [],
    };

    let totalRecentRequests = 0;

    insights.forEach((row) => {
      const profile = {
        username: row.username,
        displayName: row.display_name,
        profileUrl: row.profile_url,
        timestamp: row.timestamp,
      };

      switch (row.list_type) {
        case "close_friend":
          if (!row.is_follower) result.closeFriendsNotFollowingBack.push(profile);
          if (!row.is_following) result.closeFriendsYouDontFollow.push(profile);
          break;
        case "blocked":
          if (row.is_follower) result.blockedStillInFollowers.push(profile);
          break;
        case "hidden_story":
          if (row.is_mutual) result.hiddenStoryMutual.push(profile);
          break;
        case "recent_request":
          totalRecentRequests++;
          if (row.is_follower || row.is_following) result.requestConversions.push(profile);
          break;
        case "received_request":
          if (!row.is_follower) result.receivedNotAccepted.push(profile);
          break;
        case "removed_suggestion":
          if (row.is_following) result.removedSuggestionsNowFollowing.push(profile);
          break;
      }
    });

    res.json({
      sessionId,
      insights: result,
      conversionRate: totalRecentRequests > 0
        ? Math.round((result.requestConversions.length / totalRecentRequests) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: "Failed to compute insights" });
  }
});

// 4. Search Route
router.get("/:sessionId/search/:query", validateSessionId, async (req, res) => {
  try {
    const { sessionId, query } = req.params;
    const { page = 1, limit = 50, category = null } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (category) {
      // Search within a specific category with proper pagination
      const allResults = await database.getUsers(sessionId, category, query);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedResults = allResults.slice(startIndex, endIndex);

      res.json({
        query,
        category,
        results: {
          [category === "followers_only"
            ? "followersOnly"
            : category === "following_only"
            ? "followingOnly"
            : category]: paginatedResults,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allResults.length,
          totalPages: Math.ceil(allResults.length / limitNum),
          totalFound: allResults.length,
        },
      });
    } else {
      // Search across all categories (legacy behavior)
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const results = {
        mutual: await database.getUsers(sessionId, "mutual", query),
        followersOnly: await database.getUsers(
          sessionId,
          "followers_only",
          query
        ),
        followingOnly: await database.getUsers(
          sessionId,
          "following_only",
          query
        ),
      };

      // Paginate each category
      const paginatedResults = {};
      Object.keys(results).forEach((key) => {
        paginatedResults[key] = results[key].slice(startIndex, endIndex);
      });

      res.json({
        query,
        results: paginatedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: {
            mutual: results.mutual.length,
            followersOnly: results.followersOnly.length,
            followingOnly: results.followingOnly.length,
          },
          totalFound:
            results.mutual.length +
            results.followersOnly.length +
            results.followingOnly.length,
        },
      });
    }
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// 5. Category Route (MUST be last)
router.get("/:sessionId/:category", validateSessionId, async (req, res) => {
  try {
    const { sessionId, category } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    // Validate category
    const validCategories = ["mutual", "followers_only", "following_only"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const users = await database.getUsers(sessionId, category, search);

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      users: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
      },
    });
  } catch (error) {
    console.error("Users retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

// Helper Functions
function filterTimelineData(data, timeframe) {
  const now = new Date();
  let cutoffDate;

  switch (timeframe) {
    case "week":
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      return data; // Return all data for 'all' timeframe
  }

  return {
    ...data,
    followEvents: data.followEvents.filter(
      (event) => new Date(event.timestamp) >= cutoffDate
    ),
  };
}

function calculateDailyGrowth(followEvents) {
  if (!followEvents || followEvents.length === 0) return 0;

  // Group events by day
  const dailyEvents = followEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { follows: 0, unfollows: 0 };
    }
    if (event.type === "follow") {
      acc[date].follows++;
    } else if (event.type === "unfollow") {
      acc[date].unfollows++;
    }
    return acc;
  }, {});

  // Calculate average daily growth
  const days = Object.keys(dailyEvents);
  const totalGrowth = days.reduce((sum, date) => {
    return sum + (dailyEvents[date].follows - dailyEvents[date].unfollows);
  }, 0);

  return days.length > 0 ? totalGrowth / days.length : 0;
}

function calculateWeeklyGrowth(followEvents) {
  if (!followEvents || followEvents.length === 0) return 0;

  // Group events by week
  const weeklyEvents = followEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp);
    const weekNumber = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-W${weekNumber}`;

    if (!acc[weekKey]) {
      acc[weekKey] = { follows: 0, unfollows: 0 };
    }
    if (event.type === "follow") {
      acc[weekKey].follows++;
    } else if (event.type === "unfollow") {
      acc[weekKey].unfollows++;
    }
    return acc;
  }, {});

  // Calculate average weekly growth
  const weeks = Object.keys(weeklyEvents);
  const totalGrowth = weeks.reduce((sum, week) => {
    return sum + (weeklyEvents[week].follows - weeklyEvents[week].unfollows);
  }, 0);

  return weeks.length > 0 ? totalGrowth / weeks.length : 0;
}

function calculateMonthlyGrowth(followEvents) {
  if (!followEvents || followEvents.length === 0) return 0;

  // Group events by month
  const monthlyEvents = followEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!acc[monthKey]) {
      acc[monthKey] = { follows: 0, unfollows: 0 };
    }
    if (event.type === "follow") {
      acc[monthKey].follows++;
    } else if (event.type === "unfollow") {
      acc[monthKey].unfollows++;
    }
    return acc;
  }, {});

  // Calculate average monthly growth
  const months = Object.keys(monthlyEvents);
  const totalGrowth = months.reduce((sum, month) => {
    return (
      sum + (monthlyEvents[month].follows - monthlyEvents[month].unfollows)
    );
  }, 0);

  return months.length > 0 ? totalGrowth / months.length : 0;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = router;
