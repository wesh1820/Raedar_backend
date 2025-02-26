const mongoose = require("mongoose");

// Ticket schema
const ticketSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  availability: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Verwijzing naar de 'User' collectie
  },
});

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
