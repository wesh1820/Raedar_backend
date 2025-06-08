const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Middleware: Validate JWT token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ error: "Access denied, token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// ✅ GET: Get all tickets for the logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.userId });
    res.status(200).json({ tickets });
  } catch (err) {
    console.error("❌ Error fetching tickets:", err);
    res.status(500).json({ error: "Error fetching tickets" });
  }
});

// ✅ POST: Create a new ticket
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

// ✅ PATCH: Update ticket price
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
    res.status(500).json({ error: "Error updating ticket" });
  }
});

// ✅ NEW: Confirm payment and set amount in ticket.paid
router.post("/payment/confirm", verifyToken, async (req, res) => {
  const { ticketId, amount, vehicleId } = req.body;

  if (!ticketId || !amount) {
    return res.status(400).json({ error: "ticketId and amount are required" });
  }

  try {
    const ticket = await Ticket.findOne({ _id: ticketId, user: req.userId });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.paid) {
      return res
        .status(400)
        .json({ error: "This ticket has already been paid." });
    }

    ticket.paid = amount;
    await ticket.save();

    console.log(`✅ Payment confirmed for ticket ${ticketId}: €${amount}`);
    res.status(200).json({ message: "Payment confirmed", ticket });
  } catch (err) {
    console.error("❌ Error processing payment:", err);
    res.status(500).json({ error: "Server error during payment" });
  }
});

module.exports = router;
