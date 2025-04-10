const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Ticket = require("./models/Ticket");
const ticketRoutes = require("./routes/ticketRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();
app.use(cors());
app.use(express.json());

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

// 🔹 USER ROUTES (POST /api/users for registration and login, GET /api/users for fetching user)
app.post("/api/users", async (req, res) => {
  const { email, password, action } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    if (action === "register") {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email, password: hashedPassword });

      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "User created successfully", token, user });
    } else if (action === "login") {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ error: "User does not exist" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "Login successful", token, user });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 GET ROUTE to fetch the user details (user profile)
app.get("/api/users", async (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ email: user.email, id: user._id });
  } catch (error) {
    console.error("❌ Error fetching user details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 Tickets route
app.get("/api/users/tickets", async (req, res) => {
  const token = req.headers["authorization"]; // Get token from the Authorization header

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    const userId = decoded.userId; // Get the userId from the token

    // Fetch user and populate their tickets
    const user = await User.findById(userId).populate("tickets");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.tickets); // Send the user's tickets back
  } catch (error) {
    console.error("❌ Error fetching tickets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Routes for events and tickets
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
