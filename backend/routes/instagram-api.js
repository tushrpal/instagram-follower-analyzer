const express = require("express");
const https = require("https");
const { URLSearchParams } = require("url");
const { database } = require("../models/database");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Instagram API with Instagram Login (launched 2024)
// Configure in Meta App Dashboard under "Instagram > API setup with Instagram login"
const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:5000/api/instagram/callback";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
].join(",");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON from Instagram API")); }
      });
    }).on("error", reject);
  });
}

function httpsPostForm(url, formData) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(formData).toString();
    const u = new URL(url);
    const req = https.request({
      method: "POST",
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON from Instagram API")); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Step 1: Generate OAuth URL for the frontend to redirect to
router.get("/auth-url", requireAuth, (req, res) => {
  if (!APP_ID) {
    return res.status(503).json({ error: "Instagram API not configured on this server" });
  }
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_type: "code",
    state: String(req.session.userId),
  });
  res.json({ url: `https://api.instagram.com/oauth/authorize?${params.toString()}` });
});

// Step 2: OAuth callback — exchange code for long-lived token
router.get("/callback", async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect("/?igauth=denied");
    }
    if (!code) {
      return res.redirect("/?igauth=error");
    }

    // Exchange code for short-lived token (1 hour)
    const shortTokenData = await httpsPostForm(
      "https://api.instagram.com/oauth/access_token",
      {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }
    );

    if (!shortTokenData.access_token) {
      console.error("Instagram token exchange failed:", shortTokenData);
      return res.redirect("/?igauth=error");
    }

    // Exchange for long-lived token (60-day)
    const longTokenData = await httpsGet(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(APP_SECRET)}&access_token=${encodeURIComponent(shortTokenData.access_token)}`
    );

    if (!longTokenData.access_token) {
      console.error("Long-lived token exchange failed:", longTokenData);
      return res.redirect("/?igauth=error");
    }

    // Fetch the IG-scoped user_id (the one usable in subsequent Graph calls)
    // and the username. The `user_id` returned from token exchange is app-scoped
    // and cannot be queried directly.
    let igUserId = null;
    let igUsername = null;
    try {
      const me = await httpsGet(
        `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${encodeURIComponent(longTokenData.access_token)}`
      );
      igUserId = me?.user_id ? String(me.user_id) : null;
      igUsername = me?.username || null;
    } catch (err) {
      console.warn("Failed to fetch IG account info:", err.message);
    }

    const expiresAt = longTokenData.expires_in
      ? new Date(Date.now() + longTokenData.expires_in * 1000)
      : null;

    const userId = req.session?.userId || parseInt(state);
    if (!userId) return res.redirect("/?igauth=error");

    await database.saveInstagramToken(userId, {
      accessToken: longTokenData.access_token,
      tokenType: longTokenData.token_type || "bearer",
      expiresAt,
      instagramUserId: igUserId,
      instagramUsername: igUsername,
    });

    res.redirect("/?igauth=success");
  } catch (error) {
    console.error("Instagram OAuth callback error:", error);
    res.redirect("/?igauth=error");
  }
});

// Helper: auto-refresh long-lived token if expiring within 7 days
async function getValidToken(userId) {
  const token = await database.getInstagramToken(userId);
  if (!token) return null;

  if (token.expires_at) {
    const daysLeft = (new Date(token.expires_at) - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 7) {
      try {
        const refreshed = await httpsGet(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token.access_token)}`
        );
        if (refreshed.access_token) {
          const newExpiry = refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000)
            : null;
          await database.saveInstagramToken(userId, {
            accessToken: refreshed.access_token,
            tokenType: "bearer",
            expiresAt: newExpiry,
            instagramUserId: token.instagram_user_id,
            instagramUsername: token.instagram_username,
          });
          return { ...token, access_token: refreshed.access_token };
        }
      } catch (err) {
        console.warn("Token refresh failed:", err.message);
      }
    }
  }

  return token;
}

// Check connection status — no auth required; unauthenticated users get { connected: false }
router.get("/status", async (req, res) => {
  if (!req.session?.userId) return res.json({ connected: false });
  const token = await database.getInstagramToken(req.session.userId);
  if (!token) return res.json({ connected: false });
  res.json({
    connected: true,
    username: token.instagram_username,
    expiresAt: token.expires_at,
  });
});

// Disconnect
router.delete("/disconnect", requireAuth, async (req, res) => {
  await database.deleteInstagramToken(req.session.userId);
  res.json({ success: true });
});

// Account overview metrics
router.get("/insights/overview", requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.session.userId);
    if (!token) return res.status(404).json({ error: "No Instagram account connected" });
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram account linked" });

    const url = `https://graph.instagram.com/v21.0/me?fields=followers_count,follows_count,media_count,profile_picture_url,username,website&access_token=${encodeURIComponent(token.access_token)}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Overview error:", error);
    res.status(500).json({ error: "Failed to fetch account overview" });
  }
});

// Reach (last 30 days)
router.get("/insights/reach", requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.session.userId);
    if (!token) return res.status(404).json({ error: "No Instagram account connected" });
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram account linked" });

    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const until = Math.floor(Date.now() / 1000);
    const url = `https://graph.instagram.com/v21.0/me/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${encodeURIComponent(token.access_token)}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Reach error:", error);
    res.status(500).json({ error: "Failed to fetch reach data" });
  }
});

// Online followers by hour (best time to post)
router.get("/insights/activity", requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.session.userId);
    if (!token) return res.status(404).json({ error: "No Instagram account connected" });
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram account linked" });

    const url = `https://graph.instagram.com/v21.0/me/insights?metric=online_followers&period=lifetime&access_token=${encodeURIComponent(token.access_token)}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Activity error:", error);
    res.status(500).json({ error: "Failed to fetch activity data" });
  }
});

// Audience demographics
router.get("/insights/audience", requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.session.userId);
    if (!token) return res.status(404).json({ error: "No Instagram account connected" });
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram account linked" });

    const url = `https://graph.instagram.com/v21.0/me/insights?metric=engaged_audience_demographics&period=lifetime&breakdown=age,gender,country,city&metric_type=total_value&access_token=${encodeURIComponent(token.access_token)}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Audience error:", error);
    res.status(500).json({ error: "Failed to fetch audience data" });
  }
});

module.exports = router;
