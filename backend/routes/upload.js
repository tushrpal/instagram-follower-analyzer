const express = require("express");
const multer = require("multer");
const JSZip = require("jszip");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");
const { database } = require("../models/database");
const { analyzeFollowers } = require("../utils/analyzer");

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

    // Process the ZIP file and analyze followers
    console.log(`📦 Processing upload for session: ${sessionId}`);

    const zip = new JSZip();
    const zipData = await fs.readFile(uploadPath);
    const zipContents = await zip.loadAsync(zipData);

    let followersData = [];
    let followingData = [];
    let runningFollowersCount = 0;
    let runningFollowingCount = 0;

    // Process each file
    for (const [filename, file] of Object.entries(zipContents.files)) {
      if (!file.dir) {
        console.log(`📄 Processing file: ${filename}`);
        const content = await file.async("string");

        try {
          const data = JSON.parse(content);

          if (filename.includes("followers_")) {
            console.log("✅ Processing followers data");
            if (Array.isArray(data)) {
              followersData = data
                .filter(
                  (item) =>
                    item?.string_list_data?.[0]?.value &&
                    item?.string_list_data?.[0]?.timestamp
                )
                .sort(
                  (a, b) =>
                    a.string_list_data[0].timestamp -
                    b.string_list_data[0].timestamp
                );

              // Save follower events with running count
              for (const follower of followersData) {
                runningFollowersCount++;
                const userData = follower.string_list_data[0];
                await database.saveFollowerEvent(
                  sessionId,
                  userData.timestamp,
                  runningFollowersCount,
                  runningFollowingCount,
                  "follower",
                  userData.value
                );
              }
            }
          }

          if (filename.includes("following.json")) {
            console.log("✅ Processing following data");
            if (data?.relationships_following) {
              followingData = data.relationships_following
                .filter(
                  (item) =>
                    item?.string_list_data?.[0]?.value &&
                    item?.string_list_data?.[0]?.timestamp
                )
                .sort(
                  (a, b) =>
                    a.string_list_data[0].timestamp -
                    b.string_list_data[0].timestamp
                );

              // Save following events with running count
              for (const following of followingData) {
                runningFollowingCount++;
                const userData = following.string_list_data[0];
                await database.saveFollowerEvent(
                  sessionId,
                  userData.timestamp,
                  runningFollowersCount,
                  runningFollowingCount,
                  "following",
                  userData.value
                );
              }
            }
          }
        } catch (parseError) {
          console.error(`Error parsing ${filename}:`, parseError);
          continue;
        }
      }
    }

    // Verify we have data
    if (!followersData.length && !followingData.length) {
      throw new Error("No valid follower or following data found");
    }

    console.log(
      `📊 Found ${followersData.length} followers and ${followingData.length} following`
    );
    const analysisResult = analyzeFollowers(followersData, followingData);

    // Save analysis results
    await database.saveAnalysis(sessionId, {
      ...analysisResult,
      followers: followersData,
      following: followingData,
    });

    // Save user categories
    await database.saveUsers(sessionId, analysisResult.mutual, "mutual");
    await database.saveUsers(
      sessionId,
      analysisResult.followersOnly,
      "followers_only"
    );
    await database.saveUsers(
      sessionId,
      analysisResult.followingOnly,
      "following_only"
    );

    res.json({
      sessionId,
      summary: {
        totalFollowers: followersData.length,
        totalFollowing: followingData.length,
        mutualCount: analysisResult.mutual.length,
        followersOnlyCount: analysisResult.followersOnly.length,
        followingOnlyCount: analysisResult.followingOnly.length,
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

module.exports = router;
