const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // optioneel, want frontend stuurt dit nu niet mee
  },
  brand: {
    type: String,
    required: true, // ipv make
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  plate: {
    type: String,
    required: true,
    unique: true,
  },
  color: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
