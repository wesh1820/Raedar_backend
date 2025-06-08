const mongoose = require("mongoose");

// Schema voor één voertuig
const vehicleSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number }, // optioneel
  plate: { type: String, required: true },
});

// Hoofd User schema met extra velden toegevoegd
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: null },
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],

  // Nieuwe velden
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  street: { type: String, default: "" },
  city: { type: String, default: "" },

  premium: { type: Boolean, default: false },
  premiumType: { type: String, enum: ["month", "year"], default: null },
  premiumStartDate: { type: Date, default: null },
  premiumEndDate: { type: Date, default: null },
  premiumCancelPending: { type: Boolean, default: false },

  vehicles: [vehicleSchema],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
