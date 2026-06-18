const express = require("express");
const bcrypt = require("bcrypt");
const { database } = require("../models/database");

const router = express.Router();
const SALT_ROUNDS = 12;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await database.getUserByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

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
