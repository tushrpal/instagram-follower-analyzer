const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const analysisRoutes = require("./routes/analysis");
const { initDatabase } = require("./models/database");

const app = express();
// When running behind a reverse proxy (nginx in Docker) we need to trust the proxy
// so that middleware like express-rate-limit can correctly read client IP addresses
// and not mistake the presence of X-Forwarded-For for a header injection issue.
// Use a numeric value (number of trusted proxies) instead of `true` which is
// permissive and triggers express-rate-limit's validation error.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-domain.com"]
        : ["http://localhost:3000"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ limit: "1gb", extended: true }));

// Static files
app.use(express.static("uploads"));

// Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/analysis", analysisRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);

  // Handle express-rate-limit validation error when X-Forwarded-For is present
  // but 'trust proxy' is not configured (older versions throw this validation error).
  if (error && error.code === "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR") {
    return res.status(400).json({
      error: "Invalid proxy configuration",
      message:
        "The server received an X-Forwarded-For header but 'trust proxy' is not enabled. This usually happens when running behind a reverse proxy (nginx/Docker). The server has been configured to trust the proxy. If you still see this error, check your proxy headers.",
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// Serve static files from public directory (React build)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "public")));

  // Handle React routing - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    }
  });
}

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["http://localhost:5000", "http://localhost"] // Add Docker URLs
        : ["http://localhost:3000"],
    credentials: true,
  })
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Instagram Follower Analyzer API ready`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

module.exports = app;
