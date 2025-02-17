const express = require('express');
const Ticket = require('../models/Ticket');
const router = express.Router();

// POST /api/tickets - Create a new ticket
router.post('/', async (req, res) => {
  try {
    const { type, price, availability } = req.body;

    // Create a new ticket
    const newTicket = new Ticket({
      type,
      price,
      availability,
    });

    // Save the ticket to the database
    await newTicket.save();

    return res.status(200).json({
      message: 'Ticket created successfully',
      ticket: newTicket,
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// GET /api/tickets - Fetch all tickets
router.get('/', async (req, res) => {
  try {
    // Fetch all tickets from the database
    const tickets = await Ticket.find();

    // If no tickets are found
    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ message: 'No tickets found' });
    }

    return res.status(200).json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

module.exports = router;
