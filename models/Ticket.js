const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  price: {
    type: String, // je gebruikt string, dus laat dat zo – kan later nog veranderen naar Number
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
  latitude: {
    type: Number,
    required: false,
  },
  longitude: {
    type: Number,
    required: false,
  },
  // Nieuw: of het ticket betaald is
  paid: {
    type: Boolean,
    default: false,
  },
});

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
