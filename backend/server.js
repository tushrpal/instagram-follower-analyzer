require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const analysisRoutes = require("./routes/analysis");
const annotationsRoutes = require("./routes/annotations");
const authRoutes = require("./routes/auth");
const instagramApiRoutes = require("./routes/instagram-api");
const sessionsRoutes = require("./routes/sessions");
const { initDatabase } = require("./models/database");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Session store using same Postgres connection
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

app.use(
  session({
    store: new pgSession({ pool: sessionPool, tableName: "user_sessions", createTableIfMissing: true }),
    name: "igfa.sid",
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
          "https://pagead2.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://www.googletagservices.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.tailwindcss.com",
          "https://pagead2.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://www.googletagservices.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://youtube.com",
          "https://www.youtube-nocookie.com",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
        ],
        connectSrc: [
          "'self'",
          "https://pagead2.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://www.google-analytics.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.googletagmanager.com",
        ],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.APP_URL || "https://instagram-follower-analyzer.onrender.com", "http://localhost:5000", "http://localhost"]
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
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/annotations", annotationsRoutes);
app.use("/api/instagram", instagramApiRoutes);
app.use("/api/sessions", sessionsRoutes);

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
