const express = require("express");
const { database } = require("../models/database");

const router = express.Router();

// Get analysis summary
router.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analysis = await database.getAnalysis(sessionId);

    if (!analysis) {
      return res.status(404).json({ error: "Analysis session not found" });
    }

    res.json({
      sessionId: analysis.id,
      createdAt: analysis.created_at,
      processedAt: analysis.processed_at,
      summary: {
        totalFollowers: analysis.followers_count,
        totalFollowing: analysis.following_count,
        mutualCount: analysis.mutual_count,
        followersOnlyCount: analysis.followers_only_count,
        followingOnlyCount: analysis.following_only_count,
      },
    });
  } catch (error) {
    console.error("Analysis retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve analysis" });
  }
});

// Get users by category
router.get("/:sessionId/:category", async (req, res) => {
  try {
    const { sessionId, category } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    // Validate category
    const validCategories = ["mutual", "followers_only", "following_only"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const users = await database.getUsers(sessionId, category, search);

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      users: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
      },
    });
  } catch (error) {
    console.error("Users retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

// Search users across all categories
router.get("/:sessionId/search/:query", async (req, res) => {
  try {
    const { sessionId, query } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const results = {
      mutual: await database.getUsers(sessionId, "mutual", query),
      followersOnly: await database.getUsers(
        sessionId,
        "followers_only",
        query
      ),
      followingOnly: await database.getUsers(
        sessionId,
        "following_only",
        query
      ),
    };

    // Paginate each category
    const paginatedResults = {};
    Object.keys(results).forEach((key) => {
      paginatedResults[key] = results[key].slice(startIndex, endIndex);
    });

    res.json({
      query,
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total: {
          mutual: results.mutual.length,
          followersOnly: results.followersOnly.length,
          followingOnly: results.followingOnly.length,
        },
        totalFound:
          results.mutual.length +
          results.followersOnly.length +
          results.followingOnly.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Export data as CSV
router.get("/:sessionId/export", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { category } = req.query;

    let users;
    let filename;

    if (
      category &&
      ["mutual", "followers_only", "following_only"].includes(category)
    ) {
      users = await database.getUsers(sessionId, category);
      filename = `instagram_${category}_${sessionId.slice(0, 8)}.csv`;
    } else {
      // Export all users
      const mutual = await database.getUsers(sessionId, "mutual");
      const followersOnly = await database.getUsers(
        sessionId,
        "followers_only"
      );
      const followingOnly = await database.getUsers(
        sessionId,
        "following_only"
      );

      users = [
        ...mutual.map((u) => ({ ...u, category: "Mutual" })),
        ...followersOnly.map((u) => ({ ...u, category: "Followers Only" })),
        ...followingOnly.map((u) => ({ ...u, category: "Following Only" })),
      ];
      filename = `instagram_analysis_${sessionId.slice(0, 8)}.csv`;
    }

    // Generate CSV
    const csvHeader = "Username,Category,Profile URL\n";
    const csvRows = users
      .map(
        (user) => `"${user.username}","${user.category}","${user.href || ""}"`
      )
      .join("\n");

    const csv = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

// Analysis routes
router.get("/analysis/:sessionId/:category", async (req, res) => {
  const { sessionId, category } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Fetch all users for the category
  const allUsers = await getUsersForCategory(sessionId, category); // Implement this function

  const paginatedUsers = allUsers.slice(skip, skip + limit);

  res.json({
    users: paginatedUsers,
    total: allUsers.length,
  });
});

router.get("/analysis/:sessionId/search/:query", async (req, res) => {
  const { sessionId, query } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Fetch all search results
  const results = await searchUsers(sessionId, query); // Implement this function

  // Paginate each category in results
  const paginatedResults = {};
  Object.keys(results).forEach((key) => {
    paginatedResults[key] = results[key].slice(skip, skip + limit);
  });

  res.json({
    query,
    results: paginatedResults,
    totalFound: Object.values(results).reduce(
      (sum, arr) => sum + arr.length,
      0
    ),
  });
});

module.exports = router;
