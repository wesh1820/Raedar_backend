const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User"); // Import User model
const jwt = require("jsonwebtoken");
const router = express.Router();

// ✅ Middleware om de JWT token te valideren
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Zet userId in req object
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// ✅ GET: Haal alle tickets op voor de ingelogde gebruiker
router.get("/", verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.userId });
    res.status(200).json({ tickets });
  } catch (err) {
    console.error("❌ Error fetching tickets:", err);
    res.status(500).json({ error: "Fout bij ophalen van tickets" });
  }
});

// ✅ POST: Maak een nieuw ticket aan voor de gebruiker
router.post("/", verifyToken, async (req, res) => {
  const { type, price, availability, duration } = req.body; // Zorg ervoor dat je 'duration' hier ontvangt
  const userId = req.userId;

  if (!duration) {
    // Voeg een check toe voor de duur
    return res.status(400).json({ error: "Duration is required" });
  }

  try {
    // Maak een nieuw ticket aan
    const newTicket = new Ticket({
      type,
      price,
      availability,
      duration, // Voeg de duur toe aan het ticket
      user: userId,
    });

    const savedTicket = await newTicket.save();

    // Voeg het ticket toe aan de gebruiker
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
