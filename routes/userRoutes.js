const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Register & login endpoint
router.post("/", async (req, res) => {
  const { email, password, username, phoneNumber, action } = req.body;

  if (action === "register") {
    if (!email || !password || !username || !phoneNumber) {
      return res.status(400).json({ error: "All fields are required." });
    }

    try {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "Email is already in use." });
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: "Username is already in use." });
      }

      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        return res
          .status(400)
          .json({ error: "Phone number is already in use." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        password: hashedPassword,
        username,
        phoneNumber,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "Account successfully created", token, user });
    } catch (error) {
      console.error("❌ Error during registration:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else if (action === "login") {
    if (!phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "Phone number and password are required." });
    }

    try {
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(400).json({ error: "User does not exist." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid login credentials." });
      }

      const now = new Date();

      if (user.premium) {
        if (!user.premiumEndDate || user.premiumEndDate <= now) {
          user.premium = false;
          user.premiumType = null;
          user.premiumStartDate = null;
          user.premiumEndDate = null;
          user.premiumCancelPending = false;
          await user.save();
        }
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "Login successful", token, user });
    } catch (error) {
      console.error("❌ Error during login:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }
});

// Get user profile
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update profile
router.post("/update", authenticateToken, async (req, res) => {
  const { firstName, lastName, street, city, email, phoneNumber } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (street !== undefined) user.street = street;
    if (city !== undefined) user.city = city;
    if (email !== undefined) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    if (req.body.card) {
      const { number, expiry, cvv, holder } = req.body.card;

      if (!user.card) user.card = {};

      if (number !== undefined) user.card.number = number;
      if (expiry !== undefined) user.card.expiry = expiry;
      if (cvv !== undefined) user.card.cvv = cvv;
      if (holder !== undefined) user.card.holder = holder;
    }

    await user.save();
    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Change password
router.post("/password", authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password)
    return res.status(400).json({ error: "New password is required" });

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password changed" });
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Activate premium
router.post("/premium", authenticateToken, async (req, res) => {
  const { premiumType } = req.body; // "month" or "year"

  if (!premiumType || !["month", "year"].includes(premiumType)) {
    return res.status(400).json({ error: "Invalid premium type" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    let premiumEndDate;

    if (premiumType === "month") {
      premiumEndDate = new Date(now);
      premiumEndDate.setMonth(premiumEndDate.getMonth() + 1);
    } else if (premiumType === "year") {
      premiumEndDate = new Date(now);
      premiumEndDate.setFullYear(premiumEndDate.getFullYear() + 1);
    }

    user.premium = true;
    user.premiumType = premiumType;
    user.premiumStartDate = now;
    user.premiumEndDate = premiumEndDate;
    user.premiumCancelPending = false;

    await user.save();

    res.json({
      success: true,
      message: `Premium (${premiumType}) activated until ${premiumEndDate.toISOString()}`,
      premiumEndDate,
    });
  } catch (error) {
    console.error("❌ Error activating premium:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel premium
router.post("/premium/cancel", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.premiumCancelPending = true;
    await user.save();

    res.json({
      success: true,
      message:
        "Premium subscription will be canceled at the end of this period.",
    });
  } catch (error) {
    console.error("❌ Error canceling premium:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
