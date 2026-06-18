import { Hono } from "hono";
import * as db from "../db.js";

const annotations = new Hono();

annotations.get("/:username", async (c) => {
  const { username } = c.req.param();
  if (!username) return c.json({ error: "Invalid username" }, 400);
  const annotation = await db.getAnnotation(c.env, username);
  return c.json({ username, note: annotation?.note || null, tags: annotation?.tags || [] });
});

annotations.put("/:username", async (c) => {
  const { username } = c.req.param();
  if (!username) return c.json({ error: "Invalid username" }, 400);
  const { note, tags } = await c.req.json();
  if (note !== undefined && note !== null && typeof note !== "string") return c.json({ error: "note must be a string or null" }, 400);
  if (tags !== undefined && !Array.isArray(tags)) return c.json({ error: "tags must be an array" }, 400);
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : null;
  const cleanTags = Array.isArray(tags) ? tags.map((t) => String(t).trim().slice(0, 50)).filter(Boolean).slice(0, 20) : [];
  await db.upsertAnnotation(c.env, username, cleanNote, cleanTags);
  return c.json({ success: true, username, note: cleanNote, tags: cleanTags });
});

export default annotations;
