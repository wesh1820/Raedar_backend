const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Middleware: JWT check
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// ✅ GET: Alle tickets van de ingelogde gebruiker
router.get("/", verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.userId });
    res.status(200).json({ tickets });
  } catch (err) {
    console.error("❌ Error fetching tickets:", err);
    res.status(500).json({ error: "Fout bij ophalen van tickets" });
  }
});

// ✅ POST: Nieuw ticket aanmaken
router.post("/", verifyToken, async (req, res) => {
  const {
    type,
    price,
    availability,
    duration,
    parkingName,
    location,
    latitude,
    longitude,
  } = req.body;

  const userId = req.userId;

  if (!duration) {
    return res.status(400).json({ error: "Duration is required" });
  }

  try {
    const newTicket = new Ticket({
      type,
      price,
      availability,
      duration,
      parkingName,
      location,
      latitude,
      longitude,
      user: userId,
    });

    const savedTicket = await newTicket.save();

    // Voeg toe aan user
    await User.findByIdAndUpdate(userId, {
      $push: { tickets: savedTicket._id },
    });

    res.status(200).json({ ticket: savedTicket });
  } catch (err) {
    console.error("❌ Error creating ticket:", err);
    res.status(500).json({ error: "Error creating ticket" });
  }
});

module.exports = router;
