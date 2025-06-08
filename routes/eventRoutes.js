const express = require("express");
const router = express.Router();
const Event = require("../models/Event"); // Make sure this points to your correct Event model

// GET: Fetch all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find(); // Fetch all events from the database
    console.log("Fetched Events:", events); // Log events for debugging
    res.json(events); // Return the events in JSON format
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

module.exports = router;
