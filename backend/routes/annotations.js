const express = require("express");
const { database } = require("../models/database");

const router = express.Router();

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Invalid username" });
    }
    const annotation = await database.getAnnotation(username);
    res.json({ username, note: annotation?.note || null, tags: annotation?.tags || [] });
  } catch (error) {
    console.error("Get annotation error:", error);
    res.status(500).json({ error: "Failed to fetch annotation" });
  }
});

router.put("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Invalid username" });
    }
    const { note, tags } = req.body;
    if (note !== undefined && note !== null && typeof note !== "string") {
      return res.status(400).json({ error: "note must be a string or null" });
    }
    if (tags !== undefined && !Array.isArray(tags)) {
      return res.status(400).json({ error: "tags must be an array" });
    }
    const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : null;
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().slice(0, 50)).filter(Boolean).slice(0, 20)
      : [];
    await database.upsertAnnotation(username, cleanNote, cleanTags);
    res.json({ success: true, username, note: cleanNote, tags: cleanTags });
  } catch (error) {
    console.error("Upsert annotation error:", error);
    res.status(500).json({ error: "Failed to save annotation" });
  }
});

module.exports = router;
