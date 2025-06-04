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

// 🔹 USER ROUTES – REGISTREER / LOGIN via telefoonnummer
app.post("/api/users", async (req, res) => {
  const { email, password, action, username, phoneNumber } = req.body;

  if (
    !password ||
    (action === "register" && (!email || !username || !phoneNumber))
  ) {
    return res.status(400).json({ error: "Verplichte velden ontbreken" });
  }

  try {
    if (action === "register") {
      const existingEmail = await User.findOne({ email });
      const existingUsername = await User.findOne({ username });
      const existingPhone = await User.findOne({ phoneNumber });

      if (existingEmail) {
        return res.status(400).json({ error: "E-mailadres is al in gebruik" });
      }
      if (existingUsername) {
        return res
          .status(400)
          .json({ error: "Gebruikersnaam is al in gebruik" });
      }
      if (existingPhone) {
        return res
          .status(400)
          .json({ error: "Telefoonnummer is al in gebruik" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        username,
        phoneNumber,
        password: hashedPassword,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({
        message: "Gebruiker succesvol aangemaakt",
        token,
        user,
      });
    } else if (action === "login") {
      if (!phoneNumber) {
        return res
          .status(400)
          .json({ error: "Telefoonnummer is vereist om in te loggen" });
      }

      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res
          .status(400)
          .json({ error: "Gebruiker met dit nummer bestaat niet" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Ongeldig wachtwoord" });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.json({ message: "Login gelukt", token, user });
    } else {
      return res.status(400).json({ error: "Ongeldige actie" });
    }
  } catch (error) {
    console.error("❌ Fout:", error);
    return res.status(500).json({ error: "Interne serverfout" });
  }
});

// 🔹 GET USER PROFIEL
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    res.json(user);
  } catch (error) {
    console.error("❌ Fout bij ophalen gebruiker:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// 🔹 GET USER TICKETS
app.get("/api/users/tickets", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("tickets");
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    res.json(user.tickets);
  } catch (error) {
    console.error("❌ Fout bij ophalen tickets:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// 🔹 PREMIUM ACTIVEREN
app.post("/api/users/premium", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.premium = true;
    user.premiumCancelPending = false;
    await user.save();

    res.json({ success: true, message: "Premium geactiveerd!" });
  } catch (error) {
    console.error("❌ Fout bij premium activeren:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// 🔹 PREMIUM STOPZETTEN
app.post("/api/users/premium/cancel", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.premiumCancelPending = true;
    await user.save();

    res.json({
      success: true,
      message: "Premium wordt stopgezet aan het eind van deze maand.",
    });
  } catch (error) {
    console.error("❌ Fout bij premium annuleren:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// 🔹 Routes voor events en tickets
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);

// 🔹 Server starten
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server draait op poort ${PORT}`);
});
