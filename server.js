const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // To generate the JWT for new users
const User = require("./models/User"); // Import the User model
const ticketRoutes = require("./routes/ticketRoutes"); // Import the ticket routes
const eventRoutes = require("./routes/eventRoutes"); // Import the event routes

const app = express();
app.use(cors());
app.use(express.json()); // For parsing JSON request bodies

// Serve static files (images) from the "public/images" directory
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// 🔹 PUBLIC ROUTE: Handle User Registration and Login
app.post("/api/users", async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check if the user already exists in the database
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    user = new User({
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await user.save();

    // Generate a token for the new user
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h", // The token will expire in 1 hour
    });

    // Respond with the user's data and the token
    return res.json({ message: "User created successfully", token, user });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 ROUTES
// Event routes
app.use("/api/events", eventRoutes);

// Ticket routes
app.use("/api/tickets", ticketRoutes); // This will handle the POST request for creating tickets

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
