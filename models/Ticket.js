const mongoose = require("mongoose");

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
  duration: {
    type: Number,
    required: true, // in minuten
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ✅ Nieuw toegevoegd:
  latitude: {
    type: Number,
    required: false, // optioneel, maar aanbevolen
  },
  longitude: {
    type: Number,
    required: false,
  },
});

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
