const mongoose = require("mongoose");

// Subschema voor voertuig
const vehicleSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number }, // optioneel
  plate: { type: String, required: true },
});

// Hoofdschema voor gebruiker
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Avatar als base64 string
  avatar: { type: String, default: null },

  // Tickets gekoppeld via referentie
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],

  // Persoonlijke info
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  street: { type: String, default: "" },
  city: { type: String, default: "" },

  // Voertuigen (array van vehicleSchema)
  vehicles: [vehicleSchema],

  // Premium info
  premium: { type: Boolean, default: false },
  premiumType: { type: String, enum: ["month", "year"], default: null },
  premiumStartDate: { type: Date, default: null },
  premiumEndDate: { type: Date, default: null },
  premiumCancelPending: { type: Boolean, default: false },

  // Kaartgegevens
  card: {
    number: { type: String, default: "" },
    expiry: { type: String, default: "" },
    cvv: { type: String, default: "" },
    holder: { type: String, default: "" },
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
