const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

// Middleware voor authenticatie via JWT
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
      return res.status(400).json({ error: "Alle velden zijn verplicht." });
    }

    try {
      // Check of email, username of telefoonnummer al bestaan
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "E-mailadres is al in gebruik." });
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res
          .status(400)
          .json({ error: "Gebruikersnaam is al in gebruik." });
      }

      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        return res
          .status(400)
          .json({ error: "Telefoonnummer is al in gebruik." });
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

      return res.json({ message: "Account succesvol aangemaakt", token, user });
    } catch (error) {
      console.error("❌ Fout bij registratie:", error);
      return res.status(500).json({ error: "Interne serverfout" });
    }
  } else if (action === "login") {
    if (!phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "Telefoonnummer en wachtwoord zijn verplicht." });
    }

    try {
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(400).json({ error: "Gebruiker bestaat niet." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Ongeldige inloggegevens." });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "Inloggen gelukt", token, user });
    } catch (error) {
      console.error("❌ Fout bij inloggen:", error);
      return res.status(500).json({ error: "Interne serverfout" });
    }
  } else {
    return res.status(400).json({ error: "Ongeldige actie" });
  }
});

// Profiel ophalen
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });
    res.json(user);
  } catch (error) {
    console.error("❌ Fout bij ophalen profiel:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Premium activeren
router.post("/premium", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.premium = true;
    user.premiumCancelPending = false;
    await user.save();

    res.json({ success: true, message: "Premium geactiveerd!" });
  } catch (error) {
    console.error("❌ Fout bij activeren premium:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Premium annuleren
router.post("/premium/cancel", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.premiumCancelPending = true;
    await user.save();

    res.json({
      success: true,
      message: "Premium abonnement wordt stopgezet na deze maand.",
    });
  } catch (error) {
    console.error("❌ Fout bij annuleren premium:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

module.exports = router;
