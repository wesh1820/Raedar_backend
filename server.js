const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
require("dotenv").config();

const User = require("./models/User");
const Ticket = require("./models/Ticket");
const Ticket = require("./models/Vehicle");
const vehicleRoutes = require("./routes/vehicleRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static images from "public/images"
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// JWT Authentication middleware
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

// ───── USER ROUTES ─────

// Register or Login user
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
      // Check duplicates
      const existingEmail = await User.findOne({ email });
      const existingUsername = await User.findOne({ username });
      const existingPhone = await User.findOne({ phoneNumber });

      if (existingEmail)
        return res.status(400).json({ error: "E-mailadres is al in gebruik" });
      if (existingUsername)
        return res
          .status(400)
          .json({ error: "Gebruikersnaam is al in gebruik" });
      if (existingPhone)
        return res
          .status(400)
          .json({ error: "Telefoonnummer is al in gebruik" });

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
      if (!phoneNumber)
        return res
          .status(400)
          .json({ error: "Telefoonnummer is vereist om in te loggen" });

      const user = await User.findOne({ phoneNumber });
      if (!user)
        return res
          .status(400)
          .json({ error: "Gebruiker met dit nummer bestaat niet" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Ongeldig wachtwoord" });

      // Premium automatisch uitzetten als verlopen
      const now = new Date();
      if (user.premium && user.premiumEndDate && user.premiumEndDate <= now) {
        user.premium = false;
        user.premiumType = null;
        user.premiumStartDate = null;
        user.premiumEndDate = null;
        user.premiumCancelPending = false;
        await user.save();
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

// Get user profile (zonder password)
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

// Get user tickets
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

// Upload avatar (base64 string or URL)
app.post("/api/users/avatar", authenticateToken, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: "Geen avatar meegegeven" });

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    user.avatar = avatar;
    await user.save();

    res.json({ success: true, avatar });
  } catch (error) {
    console.error("❌ Fout bij avatar upload:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Change password
app.post("/api/users/password", authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password)
    return res.status(400).json({ error: "Nieuw wachtwoord is vereist" });

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Wachtwoord gewijzigd" });
  } catch (error) {
    console.error("❌ Fout bij wachtwoord wijzigen:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Activate premium
app.post("/api/users/premium", authenticateToken, async (req, res) => {
  const { premiumType } = req.body; // "month" of "year"

  if (!premiumType || !["month", "year"].includes(premiumType)) {
    return res.status(400).json({ error: "Ongeldig premium type" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    const now = new Date();
    let premiumEndDate;

    if (premiumType === "month") {
      premiumEndDate = new Date(now);
      premiumEndDate.setMonth(premiumEndDate.getMonth() + 1);
    } else if (premiumType === "year") {
      premiumEndDate = new Date(now);
      premiumEndDate.setFullYear(premiumEndDate.getFullYear() + 1);
    }

    user.premium = true;
    user.premiumType = premiumType;
    user.premiumStartDate = now;
    user.premiumEndDate = premiumEndDate;
    user.premiumCancelPending = false;

    await user.save();

    res.json({
      success: true,
      message: `Premium (${premiumType}) geactiveerd tot ${premiumEndDate.toISOString()}`,
      premiumEndDate,
    });
  } catch (error) {
    console.error("❌ Fout bij premium activeren:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Cancel premium
app.post("/api/users/premium/cancel", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user)
      return res.status(404).json({ error: "Gebruiker niet gevonden" });

    if (!user.premium) {
      return res
        .status(400)
        .json({ error: "Gebruiker heeft geen actief premium abonnement" });
    }

    user.premiumCancelPending = true;
    await user.save();

    res.json({
      success: true,
      message:
        "Premium annulering is gemarkeerd. Premium blijft actief tot het einde van de periode.",
    });
  } catch (error) {
    console.error("❌ Fout bij premium annuleren:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// ───── TICKET, EVENT & VEHICLE ROUTES ─────
app.use("/api/tickets", ticketRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/vehicles", vehicleRoutes);

// ───── CRONJOB VOOR PREMIUM VERVAL ─────
// Draait elke dag om middernacht om verlopen premium abonnementen uit te zetten als annulering is gevraagd
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();

    // Alleen annuleringen die voorbij de premiumEndDate zijn worden uitgezet
    const usersToCancel = await User.find({
      premium: true,
      premiumCancelPending: true,
      premiumEndDate: { $lte: now },
    });

    for (const user of usersToCancel) {
      user.premium = false;
      user.premiumType = null;
      user.premiumStartDate = null;
      user.premiumEndDate = null;
      user.premiumCancelPending = false;
      await user.save();
      console.log(`Premium abonnement uitgezet voor gebruiker ${user._id}`);
    }
  } catch (error) {
    console.error("❌ Fout in cronjob premium verval:", error);
  }
});

// Start de server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server draait op poort ${PORT}`);
});
