const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const { database } = require('../models/database');
const { analyzeFollowers } = require('../utils/analyzer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

router.post('/', upload.single('instagramData'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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

    // Search through ZIP contents
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (relativePath.includes('followers') && relativePath.endsWith('.json')) {
        const content = await zipEntry.async('text');
        followersData = JSON.parse(content);
      } else if (relativePath.includes('following') && relativePath.endsWith('.json')) {
        const content = await zipEntry.async('text');
        followingData = JSON.parse(content);
      }
    }

    // Cleanup uploaded file
    await fs.unlink(filePath);

    if (!followersData || !followingData) {
      return res.status(400).json({ 
        error: 'Invalid Instagram export file. Could not find followers.json or following.json' 
      });
    }

    // Analyze the data
    const analysisResult = analyzeFollowers(followersData, followingData);

    // Save to database
    await database.saveAnalysis(sessionId, analysisResult);
    await database.saveUsers(sessionId, analysisResult.mutual, 'mutual');
    await database.saveUsers(sessionId, analysisResult.followersOnly, 'followers_only');
    await database.saveUsers(sessionId, analysisResult.followingOnly, 'following_only');

    console.log(`✅ Analysis completed for session: ${sessionId}`);

    res.json({
      sessionId,
      summary: {
        totalFollowers: analysisResult.followers.length,
        totalFollowing: analysisResult.following.length,
        mutualCount: analysisResult.mutual.length,
        followersOnlyCount: analysisResult.followersOnly.length,
        followingOnlyCount: analysisResult.followingOnly.length
      }
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    
    // Cleanup file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to process Instagram data',
      message: error.message 
    });
  }
});

module.exports = router;