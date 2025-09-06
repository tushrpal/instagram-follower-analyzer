const express = require("express");
const { database } = require("../models/database");

const router = express.Router();

// Add input validation middleware
const validateSessionId = (req, res, next) => {
  const { sessionId } = req.params;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Invalid session ID" });
  }
  next();
};

// 1. Analysis Summary Route
router.get("/:sessionId", validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analysis = await database.getAnalysis(sessionId);

    if (!analysis) {
      return res.status(404).json({ error: "Analysis session not found" });
    }

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
      },
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
    console.log("Raw Timeline Data:", JSON.stringify(timelineData, null, 2));

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

// 4. Search Route
router.get("/:sessionId/search/:query", validateSessionId, async (req, res) => {
  try {
    const { sessionId, query } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

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
        page,
        limit,
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
