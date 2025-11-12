const express = require("express");
const multer = require("multer");
const JSZip = require("jszip");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");
const { database } = require("../models/database");
const { analyzeFollowers } = require("../utils/analyzer");
const StreamZip = require("node-stream-zip");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      path.extname(file.originalname).toLowerCase() === ".zip"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"), false);
    }
  },
});

router.post("/", upload.single("instagramData"), async (req, res) => {
  try {
    const sessionId = uuidv4();
    const uploadPath = req.file.path;

    console.log(`📦 Processing upload for session: ${sessionId}`);

    // Use optimized processing
    const processedData = await processInstagramDataOptimized(
      sessionId,
      uploadPath
    );

    res.json({
      sessionId,
      summary: {
        totalFollowers: processedData.followersCount,
        totalFollowing: processedData.followingCount,
        mutualCount: processedData.mutualCount,
        followersOnlyCount: processedData.followersOnlyCount,
        followingOnlyCount: processedData.followingOnlyCount,
        pendingRequestsCount: processedData.pendingRequestsCount,
      },
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    res.status(500).json({
      error: "Failed to process Instagram data",
      message: error.message,
    });
  } finally {
    // Cleanup uploaded file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }
  }
});

// Optimized processing function
async function processInstagramDataOptimized(sessionId, zipPath) {
  console.log(`🚀 Starting optimized processing for session: ${sessionId}`);

  const processedData = {
    followers: [],
    following: [],
    pendingRequests: [],
    unfollowedProfiles: [],
  };

  // Process ZIP file efficiently
  const zip = new JSZip();
  const zipData = await fs.readFile(zipPath);
  const zipContents = await zip.loadAsync(zipData);

  // Process all files in parallel where possible
  const fileProcessingPromises = [];

  for (const [filename, file] of Object.entries(zipContents.files)) {
    if (!file.dir) {
      fileProcessingPromises.push(
        processFileContent(filename, file, processedData)
      );
    }
  }

  await Promise.all(fileProcessingPromises);

  // Normalization: multiple files in the ZIP may each contain followers/following
  // fragments. We append during parsing which can create duplicates or unsorted
  // arrays — normalize by deduplicating (by username/value) and sorting by
  // timestamp (fallback to 0). This ensures the final arrays reflect all
  // fragments in a deterministic way.
  const normalizeList = (list) => {
    const seen = new Map();
    (list || []).forEach((item) => {
      const username = extractUsername(item);
      const timestamp = extractTimestamp(item) || 0;
      if (!username) return;
      // Keep the earliest timestamped entry for that username
      if (
        !seen.has(username) ||
        (seen.get(username).timestamp || 0) > timestamp
      ) {
        seen.set(username, { item, timestamp });
      }
    });

    // Convert back to array and sort by timestamp
    return Array.from(seen.values())
      .map((v) => v.item)
      .sort((a, b) => {
        const ta = extractTimestamp(a) || 0;
        const tb = extractTimestamp(b) || 0;
        return ta - tb;
      });
  };

  processedData.followers = normalizeList(processedData.followers);
  processedData.following = normalizeList(processedData.following);
  processedData.pendingRequests = normalizeList(processedData.pendingRequests);

  // (use global helpers extractUsername/extractTimestamp)

  // Verify we have data
  if (
    !processedData.followers.length &&
    !processedData.following.length &&
    !processedData.pendingRequests.length
  ) {
    throw new Error("No valid data found in the upload");
  }

  console.log(
    `📊 Found ${processedData.followers.length} followers, ${processedData.following.length} following, and ${processedData.pendingRequests.length} pending requests`
  );

  // Get previous session for comparison
  const previousSessions = await database.getAnalysisSessions(1);
  const previousSessionId =
    previousSessions.length > 0 ? previousSessions[0].id : null;

  // Single analysis pass - no duplicate processing
  const analysisResult = await analyzeFollowers(
    processedData.followers,
    processedData.following,
    previousSessionId,
    sessionId // Pass sessionId to prevent duplicate processing
  );

  // Create timeline events with progressive counts
  const timelineEvents = createProgressiveTimelineEvents(
    processedData.followers,
    processedData.following
  );

  console.log(
    `📈 Created ${timelineEvents.length} timeline events for session: ${sessionId}`
  );

  // Batch save all data using transactions
  await Promise.all([
    database.saveAnalysis(sessionId, {
      ...analysisResult,
      followers: processedData.followers,
      following: processedData.following,
    }),
    database.saveBatchUsers(sessionId, analysisResult.mutual, "mutual"),
    database.saveBatchUsers(
      sessionId,
      analysisResult.followersOnly,
      "followers_only"
    ),
    database.saveBatchUsers(
      sessionId,
      analysisResult.followingOnly,
      "following_only"
    ),
    // Save timeline events
    timelineEvents.length > 0
      ? database.saveBatchFollowerEvents(sessionId, timelineEvents)
      : Promise.resolve(),
    // Save pending requests
    processedData.pendingRequests.length > 0
      ? database.savePendingRequests(sessionId, processedData.pendingRequests)
      : Promise.resolve(),
    // Save unfollowed profiles
    ...processedData.unfollowedProfiles.map((profile) =>
      database.addUnfollowedProfile(
        sessionId,
        profile.username,
        "imported",
        profile.href,
        Math.floor(profile.timestamp)
      )
    ),
  ]);

  console.log(`✅ Optimized processing complete for session: ${sessionId}`);

  return {
    followersCount: processedData.followers.length,
    followingCount: processedData.following.length,
    mutualCount: analysisResult.mutual.length,
    followersOnlyCount: analysisResult.followersOnly.length,
    followingOnlyCount: analysisResult.followingOnly.length,
    pendingRequestsCount: processedData.pendingRequests.length,
  };
}

// Process individual file content
async function processFileContent(filename, file, processedData) {
  console.log(`📄 Processing file: ${filename}`);

  try {
    const content = await file.async("string");

    // Skip binary files early (images, fonts, etc.)
    const ext = path.extname(filename).toLowerCase();
    const binaryExts = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".svg",
      ".ico",
      ".woff",
      ".woff2",
      ".ttf",
    ];

    if (binaryExts.includes(ext)) {
      // Not JSON — skip silently
      console.log(`⏭ Skipping binary file: ${filename}`);
      return;
    }

    // Try to robustly extract JSON from the content. The Instagram export
    // may include raw JSON files, or HTML files that embed JSON inside a
    // <script> tag or similar. tryExtractJson will attempt several strategies
    // and return a parsed object or null.
    const data = tryExtractJson(content);

    if (!data) {
      console.log(`⏭ No JSON found in ${filename}; skipping`);
      return;
    }

    if (
      filename.includes("followers_") ||
      filename.includes("followers_1.json")
    ) {
      console.log("✅ Processing followers data");
      if (Array.isArray(data)) {
        // Append entries rather than overwrite. We'll normalize later.
        const entries = data.filter((item) => extractUsername(item));
        if (entries.length > 0) {
          processedData.followers.push(...entries);
          console.log(
            `➕ Appended ${entries.length} followers from ${filename}`
          );
        }
      }
    }

    if (filename.toLowerCase().includes("following")) {
      console.log("✅ Processing following data");
      // Accept multiple shapes:
      // - { relationships_following: [...] }
      // - [ ... ] (an array at root)
      // - { following: [...] }
      let rawEntries = [];

      if (Array.isArray(data)) {
        rawEntries = data;
      } else if (
        data?.relationships_following &&
        Array.isArray(data.relationships_following)
      ) {
        rawEntries = data.relationships_following;
      } else if (data?.following && Array.isArray(data.following)) {
        rawEntries = data.following;
      } else if (
        data?.relationships &&
        Array.isArray(data.relationships?.following)
      ) {
        // defensive: nested shape
        rawEntries = data.relationships.following;
      }

      const entries = (rawEntries || []).filter((item) =>
        extractUsername(item)
      );

      if (entries.length > 0) {
        processedData.following.push(...entries);
        console.log(
          `➕ Appended ${entries.length} following entries from ${filename}`
        );

        // Log a small sample to help debug format differences between exports
        try {
          const sample = entries.slice(0, 5).map((it) => ({
            username: extractUsername(it),
            timestamp: extractTimestamp(it) || null,
          }));
          console.log(
            `🔎 Sample following parsed from ${filename}: ${JSON.stringify(
              sample
            )}`
          );
        } catch (e) {
          // non-fatal
        }
      } else {
        console.log(
          `➖ No following entries detected in ${filename} (raw entries: ${
            (rawEntries || []).length
          })`
        );
      }
    }

    if (filename.includes("pending_follow_requests.json")) {
      console.log("✅ Processing pending requests data");
      if (data?.relationships_follow_requests_sent) {
        const entries = data.relationships_follow_requests_sent.filter((item) =>
          extractUsername(item)
        );
        if (entries.length > 0) {
          processedData.pendingRequests.push(...entries);
          console.log(
            `➕ Appended ${entries.length} pending requests from ${filename}`
          );
        }
      }
    }

    if (filename.includes("recently_unfollowed_profiles.json")) {
      console.log("✅ Processing recently unfollowed profiles data");
      if (data?.relationships_unfollowed_users) {
        const unfollowedProfiles = data.relationships_unfollowed_users
          .filter((item) => extractUsername(item))
          .map((item) => ({
            username: extractUsername(item),
            href:
              (item.string_list_data &&
                item.string_list_data[0] &&
                item.string_list_data[0].href) ||
              item.href ||
              null,
            timestamp: extractTimestamp(item),
          }));

        if (unfollowedProfiles.length > 0) {
          processedData.unfollowedProfiles.push(...unfollowedProfiles);
        }
        console.log(
          `✅ Found ${unfollowedProfiles.length} unfollowed profiles in ${filename}`
        );
      }
    }
  } catch (parseError) {
    console.error(`Error parsing ${filename}:`, parseError);
  }
}

// Global helper: extract username from common shapes
function extractUsername(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data && item.string_list_data[0];
  if (sld && sld.value) return sld.value;
  if (item.title) return item.title;
  if (item.value) return item.value;
  if (item.username) return item.username;
  return null;
}

// Global helper: extract timestamp (usually Unix seconds)
function extractTimestamp(item) {
  if (!item || typeof item !== "object") return null;
  const sld = item.string_list_data && item.string_list_data[0];
  if (sld && (sld.timestamp || sld.timestamp === 0)) return sld.timestamp;
  if (item.timestamp || item.timestamp === 0) return item.timestamp;
  return null;
}

// Helper: robust JSON extractor
function tryExtractJson(content) {
  const s = content && typeof content === "string" ? content.trim() : "";
  if (!s) return null;

  // Direct JSON
  try {
    return JSON.parse(s);
  } catch (e) {
    // continue to other strategies
  }

  // Look for JSON-like start
  const firstBracket = s.search(/[\{\[]/);
  if (firstBracket !== -1) {
    // Attempt to find a valid JSON substring starting at firstBracket
    // This is a best-effort approach for HTML files that may contain a JSON blob.
    for (let end = s.length; end > firstBracket; end--) {
      const substr = s.slice(firstBracket, end);
      try {
        return JSON.parse(substr);
      } catch (e) {
        // keep trying
      }
    }
  }

  // Extract from <script> tags
  const scriptMatch = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    const inside = scriptMatch[1];
    // Look for assignment like: window._sharedData = { ... };
    const objMatch = inside.match(/=\s*({[\s\S]*})\s*;?/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1]);
      } catch (e) {
        // fallthrough
      }
    }
    const arrMatch = inside.match(/=\s*(\[[\s\S]*\])\s*;?/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[1]);
      } catch (e) {
        // fallthrough
      }
    }
  }

  return null;
}

// Function to create timeline events with progressive counts
function createProgressiveTimelineEvents(followers, following) {
  const allEvents = [];

  // Add follower events
  (followers || []).forEach((follower) => {
    const ts = extractTimestamp(follower) || 0;
    const uname = extractUsername(follower) || "unknown";
    allEvents.push({
      timestamp: ts,
      username: uname,
      direction: "follower",
      originalTimestamp: ts,
    });
  });

  // Add following events
  (following || []).forEach((followingUser) => {
    const ts = extractTimestamp(followingUser) || 0;
    const uname = extractUsername(followingUser) || "unknown";
    allEvents.push({
      timestamp: ts,
      username: uname,
      direction: "following",
      originalTimestamp: ts,
    });
  });

  // Sort all events by timestamp
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate progressive counts
  let followersCount = 0;
  let followingCount = 0;

  const timelineEvents = allEvents.map((event) => {
    if (event.direction === "follower") {
      followersCount++;
    } else if (event.direction === "following") {
      followingCount++;
    }

    return {
      timestamp: event.timestamp,
      username: event.username,
      direction: event.direction,
      followersCount: followersCount,
      followingCount: followingCount,
    };
  });

  return timelineEvents;
}

module.exports = router;
