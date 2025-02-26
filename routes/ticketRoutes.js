const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Route to create a new ticket for a logged-in user
router.post("/", async (req, res) => {
  const { type, price, availability } = req.body;

  const token = req.headers["authorization"];
  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const jwtToken = token.split(" ")[1]; // Extract the token part

  if (!type || !price || !availability) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded); // Add this for debugging
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
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

module.exports = router;
