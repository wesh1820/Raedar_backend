const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  make: {
    type: String,
    required: true, // Bijvoorbeeld: "Toyota"
  },
  model: {
    type: String,
    required: true, // Bijvoorbeeld: "Corolla"
  },
  year: {
    type: Number,
    required: true,
  },
  licensePlate: {
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
