const express = require("express");
const { database } = require("../models/database");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Get all active sessions for the current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req.session;
    const { rows } = await database.queryRaw(
      `SELECT sid, sess, expire FROM user_sessions WHERE (sess ->> 'userId')::int = $1 ORDER BY expire DESC`,
      [userId]
    );

    const sessions = rows.map(row => {
      const sessionData = row.sess;
      return {
        sid: row.sid,
        ip: sessionData.ip,
        userAgent: sessionData.userAgent,
        createdAt: sessionData.createdAt,
        expiresAt: row.expire,
        isCurrent: row.sid === req.sessionID
      };
    });

    res.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Failed to retrieve sessions" });
  }
});

// Revoke a specific session
router.delete("/:sid", requireAuth, async (req, res) => {
  try {
    const { sid } = req.params;
    const { userId } = req.session;

    // To be safe, ensure the session being deleted belongs to the current user
    const { rows } = await database.queryRaw(
      `SELECT sess->>'userId' as "ownerId" FROM user_sessions WHERE sid = $1`,
      [sid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Session not found." });
    }

    if (rows[0].ownerId !== String(userId)) {
      return res.status(403).json({ error: "You can only delete your own sessions." });
    }

    await database.queryRaw(
      `DELETE FROM user_sessions WHERE sid = $1`,
      [sid]
    );

    res.status(200).json({ success: true, message: "Session revoked." });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

module.exports = router;
