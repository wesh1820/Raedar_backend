const mongoose = require("mongoose");

// Create a schema for the User model
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensure email is unique
  },
  password: {
    type: String,
    required: true,
  },
});

// Create the User model based on the schema
const User = mongoose.model("User", userSchema);

module.exports = User;
