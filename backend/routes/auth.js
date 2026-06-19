const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { database } = require("../models/database");
const { sendOtpEmail, sendPasswordResetEmail } = require("../utils/email");

const router = express.Router();
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const RESET_TOKEN_LIMIT_PER_72H = 3;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const existing = await database.getUserByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await database.saveOtp(email.toLowerCase(), otpHash, expiresAt);
    await sendOtpEmail(email, otp);

    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!otp) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    const existing = await database.getUserByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const otpRecord = await database.getOtp(email.toLowerCase());
    if (!otpRecord) {
      return res.status(400).json({ error: "Verification code expired or not found. Please request a new one." });
    }

    const otpValid = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!otpValid) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await database.markOtpUsed(otpRecord.id);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await database.createUser(email.toLowerCase(), passwordHash);

    req.session.userId = user.id;
    req.session.email = user.email;

    res.status(201).json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await database.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const user = await database.getUserByEmail(email.toLowerCase());
    // Always respond the same way to avoid user enumeration
    if (!user) {
      return res.json({ message: "If an account exists, a reset link has been sent" });
    }

    const recentCount = await database.countRecentResetTokens(user.id);
    if (recentCount >= RESET_TOKEN_LIMIT_PER_72H) {
      return res.status(429).json({ error: "Too many reset requests. You can request up to 3 reset links per 72 hours." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await database.saveResetToken(user.id, tokenHash, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetLink);

    res.json({ message: "If an account exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Reset token is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await database.getResetToken(tokenHash);
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await database.updateUserPassword(record.user_id, passwordHash);
    await database.markResetTokenUsed(record.id);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("igfa.sid");
    res.json({ success: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ id: req.session.userId, email: req.session.email });
});

module.exports = router;
