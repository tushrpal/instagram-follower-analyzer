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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const sessionId = uuidv4();
    const filePath = req.file.path;

    console.log(`📦 Processing upload for session: ${sessionId}`);

    // Read and extract ZIP file
    const zipData = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(zipData);

    // Look for Instagram data files
    let followersData = null;
    let followingData = null;

    // Debug: List all files in the ZIP
    console.log("📁 Files in ZIP:");
    Object.keys(zip.files).forEach((path) => console.log(path));

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories
      if (zipEntry.dir) continue;

      console.log(`📄 Processing file: ${relativePath}`);

      // More specific path matching
      if (relativePath.includes("followers_and_following/followers_1.json")) {
        const content = await zipEntry.async("text");
        followersData = JSON.parse(content);
        console.log("✅ Found followers data");
      } else if (
        relativePath.includes("followers_and_following/following.json")
      ) {
        const content = await zipEntry.async("text");
        followingData = JSON.parse(content);
        console.log("✅ Found following data");
      }
    }

    if (!followersData || !followingData) {
      console.log("❌ Missing data files:");
      console.log("Followers data:", !!followersData);
      console.log("Following data:", !!followingData);

      // Cleanup uploaded file
      await fs.unlink(filePath);

      return res.status(400).json({
        error:
          "Invalid Instagram export file. Could not find followers.json or following.json",
      });
    }

    // Analyze the data
    const analysisResult = analyzeFollowers(followersData, followingData);

    // Save to database
    await database.saveAnalysis(sessionId, analysisResult);
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

    console.log(`✅ Analysis completed for session: ${sessionId}`);

    res.json({
      sessionId,
      summary: {
        totalFollowers: analysisResult.followers.length,
        totalFollowing: analysisResult.following.length,
        mutualCount: analysisResult.mutual.length,
        followersOnlyCount: analysisResult.followersOnly.length,
        followingOnlyCount: analysisResult.followingOnly.length,
      },
    });
  } catch (error) {
    console.error("Upload processing error:", error);

    // Handle Multer errors specifically
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "File too large",
          message: "The uploaded file exceeds the 500MB size limit",
        });
      }
      return res.status(400).json({
        error: "Upload error",
        message: error.message,
      });
    }

    // Cleanup file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      error: "Failed to process Instagram data",
      message: error.message,
    });
  }
});

module.exports = router;
