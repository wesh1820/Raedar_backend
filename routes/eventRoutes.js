const express = require('express');
const router = express.Router();
const Event = require('../models/Event'); // Ensure this points to your correct Event model

router.get('/', async (req, res) => {
  try {
    const events = await Event.find(); // Fetch all events
    console.log("Fetched Events:", events); // Log the events to see if they are being fetched
    res.json(events); // Send back the data in JSON format
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
