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

// Helper middleware om token te verifiëren
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// 🔹 USER ROUTES (POST /api/users for registration and login)
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

// 🔹 GET ROUTE to fetch the user profile
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 GET user's tickets
app.get("/api/users/tickets", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("tickets");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.tickets);
  } catch (error) {
    console.error("❌ Error fetching tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 Activate Premium
app.post("/api/users/premium", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.premium = true;
    user.premiumCancelPending = false;
    await user.save();

    res.json({ success: true, message: "Premium geactiveerd!" });
  } catch (error) {
    console.error("❌ Error activating premium:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 Cancel Premium
app.post("/api/users/premium/cancel", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.premiumCancelPending = true;
    await user.save();

    res.json({
      success: true,
      message: "Premium abonnement wordt stopgezet na deze maand.",
    });
  } catch (error) {
    console.error("❌ Error canceling premium:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Routes voor events en tickets
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);

// Start de server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
