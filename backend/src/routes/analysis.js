import { Hono } from "hono";
import * as db from "../db.js";
import { getSession } from "./auth.js";

const analysis = new Hono();

// Session history
analysis.get("/", async (c) => {
  const session = await getSession(c);
  if (!session?.userId) return c.json({ error: "Authentication required" }, 401);

  const sessions = await db.getAnalysisSessions(c.env, 50, session.userId);
  return c.json({
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
});

// Session comparison
analysis.get("/compare", async (c) => {
  const a = c.req.query("a");
  const b = c.req.query("b");
  if (!a || !b) return c.json({ error: "Both session IDs (a, b) are required" }, 400);

  const [sessionA, sessionB] = await Promise.all([db.getAnalysis(c.env, a), db.getAnalysis(c.env, b)]);
  if (!sessionA || !sessionB) return c.json({ error: "One or both sessions not found" }, 404);

  const [usersA, usersB] = await Promise.all([db.getUsers(c.env, a), db.getUsers(c.env, b)]);

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
  const toUser = (username, mapB, mapA) => ({ username, href: mapB.get(username) || mapA.get(username) || null });

  const diff = {
    newFollowers: [...setB.followers].filter((u) => !setA.followers.has(u)).map((u) => toUser(u, hrefB, hrefA)),
    lostFollowers: [...setA.followers].filter((u) => !setB.followers.has(u)).map((u) => toUser(u, hrefA, hrefB)),
    newFollowing: [...setB.following].filter((u) => !setA.following.has(u)).map((u) => toUser(u, hrefB, hrefA)),
    removedFollowing: [...setA.following].filter((u) => !setB.following.has(u)).map((u) => toUser(u, hrefA, hrefB)),
  };

  return c.json({
    sessionA: { id: a, createdAt: sessionA.created_at, name: sessionA.name || null, followersCount: sessionA.followers_count, followingCount: sessionA.following_count, mutualCount: sessionA.mutual_count },
    sessionB: { id: b, createdAt: sessionB.created_at, name: sessionB.name || null, followersCount: sessionB.followers_count, followingCount: sessionB.following_count, mutualCount: sessionB.mutual_count },
    diff,
    summary: { newFollowersCount: diff.newFollowers.length, lostFollowersCount: diff.lostFollowers.length, newFollowingCount: diff.newFollowing.length, removedFollowingCount: diff.removedFollowing.length },
  });
});

// Rename session
analysis.patch("/:sessionId/name", async (c) => {
  const { sessionId } = c.req.param();
  const { name } = await c.req.json();
  if (typeof name !== "string") return c.json({ error: "name must be a string" }, 400);
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);
  await db.updateSessionName(c.env, sessionId, name.trim().slice(0, 120));
  return c.json({ success: true });
});

// Unfollow candidates
analysis.get("/:sessionId/unfollow-candidates", async (c) => {
  const { sessionId } = c.req.param();
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);
  const rows = await db.queryRaw(c.env,
    `SELECT u.username, u.href, fe.event_timestamp as followed_at
     FROM users u
     LEFT JOIN follower_events fe ON fe.session_id = u.session_id AND fe.username = u.username AND fe.direction = 'following'
     WHERE u.session_id = $1 AND u.category = 'following_only'
     ORDER BY fe.event_timestamp ASC NULLS LAST, u.username ASC`,
    [sessionId]
  );
  return c.json({ candidates: rows });
});

// Pending requests
analysis.get("/:sessionId/pending-requests", async (c) => {
  const { sessionId } = c.req.param();
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);

  const [pendingRequests, followingUsers, mutualUsers] = await Promise.all([
    db.getPendingRequests(c.env, sessionId),
    db.getUsers(c.env, sessionId, "following_only"),
    db.getUsers(c.env, sessionId, "mutual"),
  ]);

  const followingUsernames = new Set([
    ...followingUsers.map((u) => u.username),
    ...mutualUsers.map((u) => u.username),
  ]);
  const filtered = pendingRequests.filter((r) => !followingUsernames.has(r.username));

  return c.json({
    sessionId,
    pendingRequests: filtered.map((r) => ({ username: r.username, profileUrl: r.profile_url, requestDate: r.request_date, status: r.status })),
    summary: { totalCount: filtered.length, filteredCount: pendingRequests.length - filtered.length },
  });
});

// Timeline
analysis.get("/:sessionId/timeline", async (c) => {
  const { sessionId } = c.req.param();
  const timeframe = c.req.query("timeframe") || "all";
  const validTimeframes = ["all", "week", "month", "year"];
  if (!validTimeframes.includes(timeframe)) return c.json({ error: "Invalid timeframe" }, 400);

  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);

  const timelineData = await db.getTimelineData(c.env, sessionId);
  const base = { timelineData: { followEvents: [], statistics: { totalFollowers: 0, totalFollowing: 0 } }, statistics: { dailyGrowth: 0, weeklyGrowth: 0, monthlyGrowth: 0 } };
  if (!timelineData?.followEvents) return c.json(base);

  const filtered = filterTimelineData(timelineData, timeframe);
  const stats = calculateGrowthStats(filtered.followEvents);
  return c.json({ timelineData: filtered, statistics: stats });
});

// Export CSV
analysis.get("/:sessionId/export", async (c) => {
  const { sessionId } = c.req.param();
  const category = c.req.query("category");

  let users, filename;
  if (category && ["mutual", "followers_only", "following_only"].includes(category)) {
    users = await db.getUsers(c.env, sessionId, category);
    filename = `instagram_${category}_${sessionId.slice(0, 8)}.csv`;
  } else {
    const [mutual, followersOnly, followingOnly] = await Promise.all([
      db.getUsers(c.env, sessionId, "mutual"),
      db.getUsers(c.env, sessionId, "followers_only"),
      db.getUsers(c.env, sessionId, "following_only"),
    ]);
    users = [
      ...mutual.map((u) => ({ ...u, category: "Mutual" })),
      ...followersOnly.map((u) => ({ ...u, category: "Followers Only" })),
      ...followingOnly.map((u) => ({ ...u, category: "Following Only" })),
    ];
    filename = `instagram_analysis_${sessionId.slice(0, 8)}.csv`;
  }

  const csv = "Username,Category,Profile URL\n" + users.map((u) => `"${u.username}","${u.category}","${u.href || ""}"`).join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}"` },
  });
});

// Unfollowed profiles
analysis.get("/:sessionId/unfollowed", async (c) => {
  const { sessionId } = c.req.param();
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const search = c.req.query("search") || null;
  const offset = (page - 1) * limit;

  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);

  const [profiles, totalCount] = await Promise.all([
    db.getUnfollowedProfiles(c.env, sessionId, limit, offset, search),
    db.getUnfollowedProfilesCount(c.env, sessionId, search),
  ]);

  return c.json({ success: true, data: profiles, pagination: { page, limit, totalItems: totalCount, totalPages: Math.ceil(totalCount / limit) }, search: search || null });
});

// Relationship counts
analysis.get("/:sessionId/relationships", async (c) => {
  const { sessionId } = c.req.param();
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);
  const counts = await db.getRelationshipProfileCounts(c.env, sessionId);
  return c.json({ sessionId, counts });
});

// Relationship list
analysis.get("/:sessionId/relationships/:listType", async (c) => {
  const { sessionId, listType } = c.req.param();
  const validTypes = ["close_friend", "blocked", "hidden_story", "restricted", "favorited", "removed_suggestion", "received_request", "recent_request"];
  if (!validTypes.includes(listType)) return c.json({ error: "Invalid list type" }, 400);

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const search = c.req.query("search") || null;
  const offset = (page - 1) * limit;

  const [profiles, totalCount] = await Promise.all([
    db.getRelationshipProfiles(c.env, sessionId, listType, limit, offset, search),
    db.getRelationshipProfileCount(c.env, sessionId, listType, search),
  ]);

  return c.json({ profiles, pagination: { page, limit, totalItems: totalCount, totalPages: Math.ceil(totalCount / limit) } });
});

// Insights
analysis.get("/:sessionId/insights", async (c) => {
  const { sessionId } = c.req.param();
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);

  const insights = await db.queryRaw(c.env,
    `WITH followers AS (SELECT username FROM users WHERE session_id = $1 AND category IN ('mutual','followers_only')),
          following AS (SELECT username FROM users WHERE session_id = $2 AND category IN ('mutual','following_only')),
          mutual AS (SELECT username FROM users WHERE session_id = $3 AND category = 'mutual')
     SELECT rp.list_type, rp.username, rp.display_name, rp.profile_url, rp.timestamp,
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

  const result = { closeFriendsNotFollowingBack: [], closeFriendsYouDontFollow: [], blockedStillInFollowers: [], hiddenStoryMutual: [], requestConversions: [], receivedNotAccepted: [], removedSuggestionsNowFollowing: [] };
  let totalRecentRequests = 0;

  insights.forEach((row) => {
    const profile = { username: row.username, displayName: row.display_name, profileUrl: row.profile_url, timestamp: row.timestamp };
    switch (row.list_type) {
      case "close_friend":
        if (!row.is_follower) result.closeFriendsNotFollowingBack.push(profile);
        if (!row.is_following) result.closeFriendsYouDontFollow.push(profile);
        break;
      case "blocked": if (row.is_follower) result.blockedStillInFollowers.push(profile); break;
      case "hidden_story": if (row.is_mutual) result.hiddenStoryMutual.push(profile); break;
      case "recent_request":
        totalRecentRequests++;
        if (row.is_follower || row.is_following) result.requestConversions.push(profile);
        break;
      case "received_request": if (!row.is_follower) result.receivedNotAccepted.push(profile); break;
      case "removed_suggestion": if (row.is_following) result.removedSuggestionsNowFollowing.push(profile); break;
    }
  });

  return c.json({ sessionId, insights: result, conversionRate: totalRecentRequests > 0 ? Math.round((result.requestConversions.length / totalRecentRequests) * 100) : 0 });
});

// Search
analysis.get("/:sessionId/search/:query", async (c) => {
  const { sessionId, query } = c.req.param();
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const category = c.req.query("category") || null;
  const offset = (page - 1) * limit;

  if (category) {
    const all = await db.getUsers(c.env, sessionId, category, query);
    const paginated = all.slice(offset, offset + limit);
    return c.json({ query, category, results: { [category]: paginated }, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit), totalFound: all.length } });
  }

  const [mutual, followersOnly, followingOnly] = await Promise.all([
    db.getUsers(c.env, sessionId, "mutual", query),
    db.getUsers(c.env, sessionId, "followers_only", query),
    db.getUsers(c.env, sessionId, "following_only", query),
  ]);
  return c.json({
    query,
    results: { mutual: mutual.slice(offset, offset + limit), followersOnly: followersOnly.slice(offset, offset + limit), followingOnly: followingOnly.slice(offset, offset + limit) },
    pagination: { page, limit, total: { mutual: mutual.length, followersOnly: followersOnly.length, followingOnly: followingOnly.length }, totalFound: mutual.length + followersOnly.length + followingOnly.length },
  });
});

// Category list (must be last)
analysis.get("/:sessionId/:category", async (c) => {
  const { sessionId, category } = c.req.param();
  const validCategories = ["mutual", "followers_only", "following_only"];
  if (!validCategories.includes(category)) return c.json({ error: "Invalid category" }, 400);
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const search = c.req.query("search");
  const users = await db.getUsers(c.env, sessionId, category, search);
  const offset = (page - 1) * limit;
  return c.json({ users: users.slice(offset, offset + limit), pagination: { page, limit, total: users.length, totalPages: Math.ceil(users.length / limit) } });
});

// Session summary (must be after named sub-routes)
analysis.get("/:sessionId", async (c) => {
  const { sessionId } = c.req.param();
  const existing = await db.getAnalysis(c.env, sessionId);
  if (!existing) return c.json({ error: "Analysis session not found" }, 404);

  const [unfollowedCount, relationshipCounts] = await Promise.all([
    db.getUnfollowedCount(c.env, sessionId),
    db.getRelationshipProfileCounts(c.env, sessionId),
  ]);

  return c.json({
    sessionId: existing.id,
    createdAt: existing.created_at,
    processedAt: existing.processed_at,
    summary: { totalFollowers: existing.followers_count, totalFollowing: existing.following_count, mutualCount: existing.mutual_count, followersOnlyCount: existing.followers_only_count, followingOnlyCount: existing.following_only_count, unfollowedCount },
    relationshipCounts,
  });
});

// ── Timeline helpers ──────────────────────────────────────────────────────────

function filterTimelineData(data, timeframe) {
  if (timeframe === "all") return data;
  const now = new Date();
  let cutoff;
  if (timeframe === "week") cutoff = new Date(now - 7 * 86400000);
  else if (timeframe === "month") cutoff = new Date(now.setMonth(now.getMonth() - 1));
  else cutoff = new Date(now.setFullYear(now.getFullYear() - 1));
  return { ...data, followEvents: data.followEvents.filter((e) => new Date(e.timestamp) >= cutoff) };
}

function calculateGrowthStats(events) {
  if (!events?.length) return { dailyGrowth: 0, weeklyGrowth: 0, monthlyGrowth: 0 };
  const now = new Date();
  const calc = (ms) => events.filter((e) => new Date(e.timestamp) >= new Date(now - ms)).reduce((a, e) => a + (e.direction === "follower" ? 1 : -1), 0);
  return { dailyGrowth: calc(86400000), weeklyGrowth: calc(7 * 86400000), monthlyGrowth: calc(30 * 86400000) };
}

export default analysis;
