const express = require("express");
const rateLimit = require("express-rate-limit");
const { sendContactEmail } = require("../utils/email");

const router = express.Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedSubjects = new Set(["general", "bug", "feature", "privacy", "account", "other"]);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please try again later." },
});

router.post("/", contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body;

    if (website) {
      return res.status(202).json({ message: "Message received" });
    }
    if (!name || typeof name !== "string" || name.trim().length > 100) {
      return res.status(400).json({ error: "A valid name is required" });
    }
    if (!email || typeof email !== "string" || !emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    if (!allowedSubjects.has(subject)) {
      return res.status(400).json({ error: "Please select a valid topic" });
    }
    if (!message || typeof message !== "string" || message.trim().length < 20 || message.length > 5000) {
      return res.status(400).json({ error: "Message must be between 20 and 5,000 characters" });
    }

    await sendContactEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject,
      message: message.trim(),
    });
    res.status(202).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Unable to send your message right now" });
  }
});

module.exports = router;
