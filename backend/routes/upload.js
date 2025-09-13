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
    const data = JSON.parse(content);

    if (filename.includes("followers_")) {
      console.log("✅ Processing followers data");
      if (Array.isArray(data)) {
        processedData.followers = data
          .filter(
            (item) =>
              item?.string_list_data?.[0]?.value &&
              item?.string_list_data?.[0]?.timestamp
          )
          .sort(
            (a, b) =>
              a.string_list_data[0].timestamp - b.string_list_data[0].timestamp
          );
      }
    }

    if (filename.includes("following.json")) {
      console.log("✅ Processing following data");
      if (data?.relationships_following) {
        processedData.following = data.relationships_following
          .filter(
            (item) =>
              item?.string_list_data?.[0]?.value &&
              item?.string_list_data?.[0]?.timestamp
          )
          .sort(
            (a, b) =>
              a.string_list_data[0].timestamp - b.string_list_data[0].timestamp
          );
      }
    }

    if (filename.includes("pending_follow_requests.json")) {
      console.log("✅ Processing pending requests data");
      if (data?.relationships_follow_requests_sent) {
        processedData.pendingRequests = data.relationships_follow_requests_sent
          .filter(
            (item) =>
              item?.string_list_data?.[0]?.value &&
              item?.string_list_data?.[0]?.timestamp
          )
          .sort(
            (a, b) =>
              b.string_list_data[0].timestamp - a.string_list_data[0].timestamp
          );
      }
    }

    if (filename.includes("recently_unfollowed_profiles.json")) {
      console.log("✅ Processing recently unfollowed profiles data");
      if (data?.relationships_unfollowed_users) {
        const unfollowedProfiles = data.relationships_unfollowed_users
          .filter(
            (item) =>
              item?.string_list_data?.[0]?.value &&
              item?.string_list_data?.[0]?.timestamp
          )
          .map((item) => ({
            username: item.string_list_data[0].value,
            href: item.string_list_data[0].href,
            timestamp: item.string_list_data[0].timestamp,
          }));

        processedData.unfollowedProfiles = unfollowedProfiles;
        console.log(
          `✅ Found ${unfollowedProfiles.length} unfollowed profiles`
        );
      }
    }
  } catch (parseError) {
    console.error(`Error parsing ${filename}:`, parseError);
  }
}

// Function to create timeline events with progressive counts
function createProgressiveTimelineEvents(followers, following) {
  const allEvents = [];

  // Add follower events
  followers.forEach((follower) => {
    allEvents.push({
      timestamp: follower.string_list_data[0].timestamp,
      username: follower.string_list_data[0].value,
      direction: "follower",
      originalTimestamp: follower.string_list_data[0].timestamp,
    });
  });

  // Add following events
  following.forEach((followingUser) => {
    allEvents.push({
      timestamp: followingUser.string_list_data[0].timestamp,
      username: followingUser.string_list_data[0].value,
      direction: "following",
      originalTimestamp: followingUser.string_list_data[0].timestamp,
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
