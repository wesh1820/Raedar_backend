const mongoose = require("mongoose");

// User schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Zorg ervoor dat het email uniek is
  },
  password: {
    type: String,
    required: true,
  },
  tickets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket", // Verwijzing naar de 'Ticket' collectie
    },
  ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
