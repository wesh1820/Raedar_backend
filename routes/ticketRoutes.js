const express = require("express");
const Ticket = require("../models/Ticket");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Set the userId from token to request object
    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Create a new ticket (with userId)
router.post("/", verifyToken, async (req, res) => {
  const { type, price, availability } = req.body;
  const userId = req.userId; // Get userId from the token

  try {
    // Create a new ticket and associate it with the user
    const newTicket = new Ticket({
      type,
      price,
      availability,
      user: userId, // Link ticket to the user
    });

    const savedTicket = await newTicket.save();
    res.status(200).json({ ticket: savedTicket });
  } catch (err) {
    console.error("❌ Error creating ticket:", err);
    res.status(500).json({ error: "Error creating ticket" });
  }
});

module.exports = router;
