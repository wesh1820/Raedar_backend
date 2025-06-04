const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  tickets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
  ],
  premium: {
    type: Boolean,
    default: false,
  },
  premiumCancelPending: {
    type: Boolean,
    default: false, // true als user premium wil opzeggen maar nog in looptijd zit
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
