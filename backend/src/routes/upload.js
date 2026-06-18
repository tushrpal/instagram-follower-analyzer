import { Hono } from "hono";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db.js";
import { getSession } from "./auth.js";
import { analyzeFollowers } from "../analyzer.js";

const upload = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

upload.post("/", async (c) => {
  const session = await getSession(c);
  const userId = session?.userId || null;

  const contentType = c.req.header("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Expected multipart/form-data" }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("instagramData");

  if (!file || typeof file === "string") {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const filename = file.name || "";
  if (!filename.toLowerCase().endsWith(".zip") &&
      file.type !== "application/zip" &&
      file.type !== "application/x-zip-compressed") {
    return c.json({ error: "Only ZIP files are allowed" }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "File exceeds the 10 MB limit. Please trim your Instagram export to only include the followers and following folders." }, 413);
  }

  const sessionId = uuidv4();
  await db.createJob(c.env, sessionId);

  // Read the file into a buffer before handing off to waitUntil
  const arrayBuffer = await file.arrayBuffer();

  // Return immediately; process in background
  c.executionCtx.waitUntil(
    processUpload(c.env, sessionId, arrayBuffer, userId)
  );

  return c.json({ sessionId }, 202);
});

// Polling status endpoint (replaces SSE)
upload.get("/status/:sessionId", async (c) => {
  const { sessionId } = c.req.param();
  if (!sessionId) return c.json({ error: "Invalid session ID" }, 400);

  const job = await db.getJob(c.env, sessionId);
  if (!job) return c.json({ error: "Job not found" }, 404);

  return c.json({
    sessionId,
    status: job.status,
    message: job.message,
    error: job.error,
    result: job.result,
  });
});

// ── Background processing ─────────────────────────────────────────────────────

async function processUpload(env, sessionId, arrayBuffer, userId) {
  const progress = (msg) => db.updateJob(env, sessionId, "processing", msg);

  try {
    await progress("Reading ZIP file…");
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(arrayBuffer);

    await progress("Parsing follower data files…");

    const processedData = {
      followers: [],
      following: [],
      pendingRequests: [],
      unfollowedProfiles: [],
      relationshipProfiles: [],
    };

    const fileProcessingPromises = [];
    for (const [filename, file] of Object.entries(zipContents.files)) {
      if (!file.dir) {
        fileProcessingPromises.push(processFileContent(filename, file, processedData));
      }
    }
    await Promise.all(fileProcessingPromises);

    await progress("Normalizing data…");
    processedData.followers = normalizeList(processedData.followers);
    processedData.following = normalizeList(processedData.following);
    processedData.pendingRequests = normalizeList(processedData.pendingRequests);

    if (!processedData.followers.length && !processedData.following.length &&
        !processedData.pendingRequests.length && !processedData.relationshipProfiles.length) {
      throw new Error("No valid Instagram data found in the ZIP. Make sure you exported the 'followers_and_following' folder.");
    }

    const previousSessions = await db.getAnalysisSessions(env, 1);
    const previousSessionId = previousSessions.length > 0 ? previousSessions[0].id : null;

    await progress(`Analyzing ${processedData.followers.length} followers and ${processedData.following.length} following…`);

    const analysisResult = await analyzeFollowers(
      env,
      processedData.followers,
      processedData.following,
      previousSessionId,
      sessionId
    );

    const timelineEvents = createProgressiveTimelineEvents(
      processedData.followers,
      processedData.following
    );

    await progress("Saving to database…");

    await Promise.all([
      db.saveAnalysis(env, sessionId, {
        ...analysisResult,
        followers: processedData.followers,
        following: processedData.following,
      }, userId),
      db.saveBatchUsers(env, sessionId, analysisResult.mutual, "mutual"),
      db.saveBatchUsers(env, sessionId, analysisResult.followersOnly, "followers_only"),
      db.saveBatchUsers(env, sessionId, analysisResult.followingOnly, "following_only"),
      timelineEvents.length > 0 ? db.saveBatchFollowerEvents(env, sessionId, timelineEvents) : Promise.resolve(),
      processedData.pendingRequests.length > 0 ? db.savePendingRequests(env, sessionId, processedData.pendingRequests) : Promise.resolve(),
      ...processedData.unfollowedProfiles.map((p) =>
        db.addUnfollowedProfile(env, sessionId, p.username, "imported", p.href, Math.floor(p.timestamp), "imported")
      ),
      processedData.relationshipProfiles.length > 0 ? db.saveRelationshipProfiles(env, sessionId, processedData.relationshipProfiles) : Promise.resolve(),
    ]);

    await db.updateJob(env, sessionId, "done", "Complete", null, {
      sessionId,
      summary: {
        totalFollowers: processedData.followers.length,
        totalFollowing: processedData.following.length,
        mutualCount: analysisResult.mutual.length,
        followersOnlyCount: analysisResult.followersOnly.length,
        followingOnlyCount: analysisResult.followingOnly.length,
        pendingRequestsCount: processedData.pendingRequests.length,
      },
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    await db.updateJob(env, sessionId, "error", "Failed", error.message || "Failed to process Instagram data");
  }
}

// ── ZIP parsing (same logic as original) ─────────────────────────────────────

async function processFileContent(filename, file, processedData) {
  try {
    const binaryExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"];
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (binaryExts.includes(ext)) return;

    const content = await file.async("string");
    const data = tryExtractJson(content);
    if (!data) return;

    const basename = filename.split("/").pop().toLowerCase();

    if (basename.startsWith("followers_") && basename.endsWith(".json")) {
      if (Array.isArray(data)) {
        const entries = data.filter((item) => extractUsername(item));
        processedData.followers.push(...entries);
      }
    }

    if (basename === "following.json") {
      let rawEntries = [];
      if (Array.isArray(data)) rawEntries = data;
      else if (data?.relationships_following) rawEntries = data.relationships_following;
      else if (data?.following) rawEntries = data.following;
      processedData.following.push(...rawEntries.filter((item) => extractUsername(item)));
    }

    if (basename === "pending_follow_requests.json") {
      let rawEntries = Array.isArray(data) ? data : (data?.relationships_follow_requests_sent || []);
      processedData.pendingRequests.push(...rawEntries.filter((item) => extractUsername(item)));
    }

    if (basename === "recently_unfollowed_profiles.json") {
      let rawEntries = Array.isArray(data) ? data : (data?.relationships_unfollowed_users || []);
      const profiles = rawEntries.filter((item) => extractUsername(item)).map((item) => ({
        username: extractUsername(item),
        href: extractUrl(item),
        timestamp: extractTimestamp(item),
      }));
      processedData.unfollowedProfiles.push(...profiles);
    }

    const relationshipFileMap = {
      "close_friends.json": "close_friend",
      "blocked_profiles.json": "blocked",
      "hide_story_from.json": "hidden_story",
      "restricted_profiles.json": "restricted",
      "profiles_you've_favorited.json": "favorited",
      "removed_suggestions.json": "removed_suggestion",
      "follow_requests_you've_received.json": "received_request",
      "recent_follow_requests.json": "recent_request",
    };
    const listType = relationshipFileMap[basename];
    if (listType) {
      const entries = Array.isArray(data) ? data : [data];
      const profiles = entries
        .filter((item) => item && typeof item === "object" && extractUsername(item))
        .map((item) => ({
          username: extractUsername(item),
          displayName: extractDisplayName(item),
          listType,
          profileUrl: extractUrl(item),
          fbid: item.fbid || null,
          timestamp: extractTimestamp(item),
        }));
      processedData.relationshipProfiles.push(...profiles);
    }
  } catch (err) {
    console.error(`Error parsing ${filename}:`, err);
  }
}

function normalizeList(list) {
  const seen = new Map();
  (list || []).forEach((item) => {
    const username = extractUsername(item);
    const timestamp = extractTimestamp(item) || 0;
    if (!username) return;
    if (!seen.has(username) || (seen.get(username).timestamp || 0) > timestamp) {
      seen.set(username, { item, timestamp });
    }
  });
  return Array.from(seen.values()).map((v) => v.item).sort((a, b) => (extractTimestamp(a) || 0) - (extractTimestamp(b) || 0));
}

function createProgressiveTimelineEvents(followers, following) {
  const allEvents = [];
  (followers || []).forEach((f) => {
    const ts = extractTimestamp(f) || 0;
    allEvents.push({ timestamp: ts, username: extractUsername(f) || "unknown", direction: "follower" });
  });
  (following || []).forEach((f) => {
    const ts = extractTimestamp(f) || 0;
    allEvents.push({ timestamp: ts, username: extractUsername(f) || "unknown", direction: "following" });
  });
  allEvents.sort((a, b) => a.timestamp - b.timestamp);
  let followersCount = 0, followingCount = 0;
  return allEvents.map((event) => {
    if (event.direction === "follower") followersCount++;
    else followingCount++;
    return { timestamp: event.timestamp, username: event.username, direction: event.direction, followersCount, followingCount };
  });
}

// ── JSON / field helpers (identical to original upload.js) ────────────────────

function extractDisplayName(item) {
  if (!item || typeof item !== "object") return null;
  if (Array.isArray(item.label_values)) {
    const entry = item.label_values.find((lv) => lv.label === "Name");
    if (entry?.value) return entry.value;
  }
  return null;
}

function extractUsername(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld?.value) return sld.value;
  if (item.title) return item.title;
  if (Array.isArray(item.label_values)) {
    const entry = item.label_values.find((lv) => lv.label === "Username");
    if (entry?.value) return entry.value;
  }
  if (item.value) return item.value;
  if (item.username) return item.username;
  return null;
}

function extractTimestamp(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld && (sld.timestamp || sld.timestamp === 0)) return sld.timestamp;
  if (item.timestamp || item.timestamp === 0) return item.timestamp;
  return null;
}

function extractUrl(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data?.[0];
  if (sld?.href) return sld.href;
  if (item.href) return item.href;
  if (Array.isArray(item.label_values)) {
    const entry = item.label_values.find((lv) => lv.label === "URL");
    if (entry?.value) return entry.value;
  }
  return null;
}

function tryExtractJson(content) {
  const s = typeof content === "string" ? content.trim() : "";
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const firstBracket = s.search(/[{[]/);
  if (firstBracket !== -1) {
    for (let end = s.length; end > firstBracket; end--) {
      try { return JSON.parse(s.slice(firstBracket, end)); } catch {}
    }
  }
  return null;
}

export default upload;
