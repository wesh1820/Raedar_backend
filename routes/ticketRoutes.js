const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
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
    req.userId = decoded.userId;
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

// ✅ POST: Maak een nieuw ticket aan
router.post("/", verifyToken, async (req, res) => {
  const { type, price, availability, duration, latitude, longitude } = req.body;

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
      latitude,
      longitude,
      user: userId,
    });

    const savedTicket = await newTicket.save();

    await User.findByIdAndUpdate(userId, {
      $push: { tickets: savedTicket._id },
    });

    res.status(200).json({ ticket: savedTicket });
  } catch (err) {
    console.error("❌ Error creating ticket:", err);
    res.status(500).json({ error: "Error creating ticket" });
  }
});

// ✅ PATCH: Update ticketprijs
router.patch("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;

  try {
    const ticket = await Ticket.findOne({ _id: id, user: req.userId });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.price = price;
    const updatedTicket = await ticket.save();

    res.status(200).json({ ticket: updatedTicket });
  } catch (err) {
    console.error("❌ Error updating ticket:", err);
    res.status(500).json({ error: "Fout bij bijwerken van ticket" });
  }
});

// ✅ POST: Bevestig betaling
router.post("/payment/confirm", verifyToken, async (req, res) => {
  const { ticketId, amount, vehicleId } = req.body;

  if (!ticketId || !amount) {
    return res.status(400).json({ error: "ticketId en amount zijn verplicht" });
  }

  try {
    const ticket = await Ticket.findOne({ _id: ticketId, user: req.userId });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket niet gevonden" });
    }

    // Markeer als betaald
    ticket.paid = true;
    await ticket.save();

    console.log("💰 Betaling bevestigd:", {
      ticketId,
      bedrag: amount,
      voertuig: vehicleId,
    });

    res.status(200).json({ message: "Betaling succesvol verwerkt." });
  } catch (err) {
    console.error("❌ Fout bij betaling:", err);
    res.status(500).json({ error: "Serverfout bij betaling" });
  }
});

module.exports = router;
