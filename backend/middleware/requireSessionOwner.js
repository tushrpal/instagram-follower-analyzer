const { database } = require("../models/database");

async function requireSessionOwner(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.query.a;
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!sessionId || !(await database.isSessionOwner(sessionId, req.session.userId))) {
      return res.status(404).json({ error: "Analysis session not found" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireSessionOwner;
