const express = require("express");
const https = require("https");
const { database } = require("../models/database");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:5000/api/instagram/callback";

// Helper: simple HTTPS GET
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

// Step 1: Generate OAuth URL for the frontend to redirect to
router.get("/auth-url", requireAuth, (req, res) => {
  if (!APP_ID) {
    return res.status(503).json({ error: "Instagram API not configured on this server" });
  }
  const url = `https://www.facebook.com/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=instagram_basic,instagram_manage_insights,read_insights&response_type=code&state=${req.session.userId}`;
  res.json({ url });
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

    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;
    const tokenData = await httpsGet(tokenUrl);

    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return res.redirect("/?igauth=error");
    }

    // Exchange for long-lived token (60-day)
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;
    const longTokenData = await httpsGet(longTokenUrl);

    // Get Instagram business account ID and username
    const meUrl = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${longTokenData.access_token}`;
    const meData = await httpsGet(meUrl);
    const igUserId = meData?.instagram_business_account?.id || null;

    let igUsername = null;
    if (igUserId) {
      const igMeUrl = `https://graph.facebook.com/v19.0/${igUserId}?fields=username&access_token=${longTokenData.access_token}`;
      const igMe = await httpsGet(igMeUrl);
      igUsername = igMe?.username || null;
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

// Helper: auto-refresh token if expiring within 7 days
async function getValidToken(userId) {
  const token = await database.getInstagramToken(userId);
  if (!token) return null;

  // Refresh if expiring within 7 days
  if (token.expires_at) {
    const daysLeft = (new Date(token.expires_at) - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 7 && APP_SECRET) {
      try {
        const refreshUrl = `https://graph.facebook.com/v19.0/refresh_access_token?grant_type=ig_refresh_token&access_token=${token.access_token}`;
        const refreshed = await httpsGet(refreshUrl);
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
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram Business account linked" });

    const url = `https://graph.facebook.com/v19.0/${token.instagram_user_id}?fields=followers_count,follows_count,media_count,profile_picture_url,username,website&access_token=${token.access_token}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Overview error:", error);
    res.status(500).json({ error: "Failed to fetch account overview" });
  }
});

// Reach and impressions (last 30 days)
router.get("/insights/reach", requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.session.userId);
    if (!token) return res.status(404).json({ error: "No Instagram account connected" });
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram Business account linked" });

    const url = `https://graph.facebook.com/v19.0/${token.instagram_user_id}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token.access_token}`;
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
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram Business account linked" });

    const url = `https://graph.facebook.com/v19.0/${token.instagram_user_id}/insights?metric=online_followers&period=lifetime&access_token=${token.access_token}`;
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
    if (!token.instagram_user_id) return res.status(422).json({ error: "No Instagram Business account linked" });

    const url = `https://graph.facebook.com/v19.0/${token.instagram_user_id}/insights?metric=follower_demographics&period=lifetime&breakdown=age,gender,country,city&access_token=${token.access_token}`;
    const data = await httpsGet(url);
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (error) {
    console.error("Audience error:", error);
    res.status(500).json({ error: "Failed to fetch audience data" });
  }
});

module.exports = router;
