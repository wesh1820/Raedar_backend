// server/routes/ticketRoutes.js

const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to authenticate the user using the JWT token
const authenticateUser = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const jwtToken = token.split(" ")[1]; // Extract the token part

  try {
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Store userId from the token
    next(); // Proceed to the next middleware or route
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Route to create a new ticket for a logged-in user
router.post("/", authenticateUser, async (req, res) => {
  const { type, price, availability } = req.body;

  try {
    // Create a new ticket for the logged-in user
    const newTicket = new Ticket({
      type,
      price,
      availability,
      user: req.userId, // Associate ticket with the logged-in user
    });

    // Save the ticket to the database
    await newTicket.save();

    // Optionally, update the User's tickets array
    await User.findByIdAndUpdate(req.userId, {
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

// Route to fetch tickets for the authenticated user
router.get("/user-tickets", authenticateUser, async (req, res) => {
  try {
    // Fetch tickets for the logged-in user
    const tickets = await Ticket.find({ user: req.userId });

    res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
