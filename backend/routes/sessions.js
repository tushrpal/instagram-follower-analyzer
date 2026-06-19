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

    await Promise.all([
      database.saveBatchUsers(sessionId, mutual, "mutual"),
      database.saveBatchUsers(sessionId, followersOnly, "followers_only"),
      database.saveBatchUsers(sessionId, followingOnly, "following_only"),
    ]);

    if (pendingRequests.length > 0) {
      const valid = pendingRequests.filter((r) => r.username);
      for (const r of valid) {
        await database.pool.query(
          `INSERT INTO pending_requests (session_id, username, profile_url, request_timestamp)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sessionId, r.username, r.profileUrl || null, r.requestDate || null]
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
