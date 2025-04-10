const mongoose = require("mongoose");

// Event Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String }, // Optional
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
