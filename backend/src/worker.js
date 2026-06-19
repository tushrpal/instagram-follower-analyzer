import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { initDatabase, saveAnalysis } from "./db.js";
import { getSession } from "./routes/auth.js";
import authRouter from "./routes/auth.js";
import uploadRouter from "./routes/upload.js";
import analysisRouter from "./routes/analysis.js";
import annotationsRouter from "./routes/annotations.js";

const app = new Hono();

// Simple in-memory rate limiter (per isolate, resets on cold start)
// Sufficient for abuse prevention; Workers isolates are per-region.
const rateLimitMap = new Map();
app.use("/api/*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 100;

  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);

  if (entry.count > max) {
    return c.json({ error: "Too many requests, please try again later." }, 429);
  }
  return next();
});

// CORS — must run after rate limit but before routes
app.use("*", async (c, next) => {
  const appUrl = c.env.APP_URL || "https://instafolloweranalyzer.com";
  return cors({
    origin: [
      appUrl,
      "https://www.instafolloweranalyzer.com",
      "https://instagram-follower-analyzer.pages.dev",
      "http://localhost:3000",
    ],
    credentials: true,
  })(c, next);
});

// Security headers
app.use("*", secureHeaders());

// Routes
app.route("/api/auth", authRouter);
app.route("/api/upload", uploadRouter);
app.route("/api/analysis", analysisRouter);
app.route("/api/annotations", annotationsRouter);

// Lightweight session summary save (browser-side processing)
app.post("/api/sessions", async (c) => {
  try {
    const { sessionId, summary } = await c.req.json();
    if (!sessionId || !summary) return c.json({ error: "Missing sessionId or summary" }, 400);
    const session = await getSession(c);
    const userId = session?.userId || null;
    await saveAnalysis(c.env, sessionId, {
      followers: { length: summary.totalFollowers },
      following: { length: summary.totalFollowing },
      mutual: { length: summary.mutualCount },
      followersOnly: { length: summary.followersOnlyCount },
      followingOnly: { length: summary.followingOnlyCount },
    }, userId);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false });
  }
});

// Health check
app.get("/api/health", (c) => c.json({ status: "OK", timestamp: new Date().toISOString() }));

// 404 for unmatched API routes
app.all("/api/*", (c) => c.json({ error: "Route not found" }, 404));

let dbInitialized = false;

export default {
  async fetch(request, env, ctx) {
    if (!dbInitialized) {
      try {
        await initDatabase(env);
        dbInitialized = true;
      } catch (err) {
        console.error("DB init failed:", err);
      }
    }
    return app.fetch(request, env, ctx);
  },
};
