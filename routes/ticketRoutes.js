const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Route to create a new ticket for a logged-in user
router.post("/", async (req, res) => {
  const { type, price, availability } = req.body;

  const token = req.headers["authorization"]; // Get token from the Authorization header

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Create a new ticket for the logged-in user
    const newTicket = new Ticket({
      type,
      price,
      availability,
      user: userId, // Associate ticket with the logged-in user
    });

    // Save the ticket to the database
    await newTicket.save();

    // Optionally, update the User's tickets array
    await User.findByIdAndUpdate(userId, {
      $push: { tickets: newTicket._id }, // Add the ticket to the user's tickets array
    });

    res
      .status(201)
      .json({ message: "Ticket created successfully", ticket: newTicket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
