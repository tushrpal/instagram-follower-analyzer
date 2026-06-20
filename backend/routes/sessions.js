const express = require("express");
const { database } = require("../models/database");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();
router.use(optionalAuth);

router.post("/", async (req, res) => {
  try {
    const {
      sessionId,
      summary,
      mutual = [],
      followersOnly = [],
      followingOnly = [],
      pendingRequests = [],
      unfollowedProfiles = [],
      relationshipProfiles = [],
    } = req.body;

    if (!sessionId || !summary) {
      return res.status(400).json({ error: "sessionId and summary are required" });
    }

    const userId = req.user?.id || null;

    await database.pool.query(
      `INSERT INTO analysis_sessions
       (id, followers_count, following_count, mutual_count, followers_only_count, following_only_count, processed_at, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        sessionId,
        summary.totalFollowers,
        summary.totalFollowing,
        summary.mutualCount,
        summary.followersOnlyCount,
        summary.followingOnlyCount,
        userId,
      ]
    );

    // Build progressive timeline events from timestamped follower/following arrays
    const allEvents = [];
    for (const u of [...(mutual || []), ...(followersOnly || [])]) {
      if (u.timestamp) allEvents.push({ timestamp: u.timestamp, username: u.username || u.value, direction: "follower" });
    }
    for (const u of [...(mutual || []), ...(followingOnly || [])]) {
      if (u.timestamp) allEvents.push({ timestamp: u.timestamp, username: u.username || u.value, direction: "following" });
    }
    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    let fc = 0, fwc = 0;
    const timelineEvents = allEvents.map((e) => {
      if (e.direction === "follower") fc++; else fwc++;
      return { ...e, followersCount: fc, followingCount: fwc };
    });

    await Promise.all([
      database.saveBatchUsers(sessionId, mutual, "mutual"),
      database.saveBatchUsers(sessionId, followersOnly, "followers_only"),
      database.saveBatchUsers(sessionId, followingOnly, "following_only"),
      timelineEvents.length > 0 ? database.saveBatchFollowerEvents(sessionId, timelineEvents) : Promise.resolve(),
    ]);

    if (pendingRequests.length > 0) {
      const valid = pendingRequests.filter((r) => r.username);
      for (const r of valid) {
        // requestDate arrives as an ISO string from the browser analyzer; convert to Unix seconds for the bigint column
        const ts = r.requestDate ? Math.floor(new Date(r.requestDate).getTime() / 1000) : null;
        await database.pool.query(
          `INSERT INTO pending_requests (session_id, username, profile_url, request_timestamp)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, r.username, r.profileUrl || null, ts]
        );
      }
    }

    for (const profile of unfollowedProfiles) {
      const ts = profile.timestamp != null ? Math.floor(profile.timestamp) : null;
      await database.addUnfollowedProfile(sessionId, profile.username, "imported", profile.href || null, ts);
    }

    if (relationshipProfiles.length > 0) {
      await database.saveRelationshipProfiles(sessionId, relationshipProfiles);
    }

    res.status(201).json({ sessionId });
  } catch (error) {
    console.error("Session save error:", error);
    res.status(500).json({ error: "Failed to save session" });
  }
});

module.exports = router;
