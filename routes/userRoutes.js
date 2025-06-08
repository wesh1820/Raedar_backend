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

      // Controleer of premium verlopen is of premiumEndDate ontbreekt
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

// Profiel updaten
router.post("/update", authenticateToken, async (req, res) => {
  const { firstName, lastName, street, city, email, phoneNumber } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    // Update de velden
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (street !== undefined) user.street = street;
    if (city !== undefined) user.city = city;
    if (email !== undefined) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    res.json({ success: true, message: "Profiel bijgewerkt" });
  } catch (error) {
    console.error("❌ Fout bij updaten profiel:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Avatar uploaden
router.post("/avatar", authenticateToken, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: "Geen avatar meegegeven" });

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.avatar = avatar;
    await user.save();

    res.json({ success: true, avatar });
  } catch (error) {
    console.error("Fout bij avatar upload:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Wachtwoord wijzigen
router.post("/password", authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password)
    return res.status(400).json({ error: "Nieuw wachtwoord is vereist" });

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Wachtwoord gewijzigd" });
  } catch (error) {
    console.error("Fout bij wachtwoord wijzigen:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Premium activeren
router.post("/premium", authenticateToken, async (req, res) => {
  const { premiumType } = req.body; // "month" of "year"

  if (!premiumType || !["month", "year"].includes(premiumType)) {
    return res.status(400).json({ error: "Ongeldig premium type" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

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
      message: `Premium (${premiumType}) geactiveerd tot ${premiumEndDate.toISOString()}`,
      premiumEndDate,
    });
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
