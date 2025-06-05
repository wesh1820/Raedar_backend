const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const jwt = require("jsonwebtoken");

// Middleware voor authenticatie via JWT (zelfde als userroutes)
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

// Alle voertuigen ophalen van ingelogde gebruiker
router.get("/", authenticateToken, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.json(vehicles);
  } catch (error) {
    console.error("Fout bij ophalen voertuigen:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Voertuig toevoegen
router.post("/", authenticateToken, async (req, res) => {
  const { make, model, year, licensePlate, color } = req.body;

  if (!make || !model || !year || !licensePlate) {
    return res.status(400).json({ error: "Vereiste velden missen" });
  }

  try {
    // Check op uniek kenteken
    const existingVehicle = await Vehicle.findOne({ licensePlate });
    if (existingVehicle) {
      return res.status(400).json({ error: "Kenteken al in gebruik" });
    }

    const vehicle = new Vehicle({
      userId: req.userId,
      make,
      model,
      year,
      licensePlate,
      color,
    });

    await vehicle.save();
    res.json({ message: "Voertuig toegevoegd", vehicle });
  } catch (error) {
    console.error("Fout bij toevoegen voertuig:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Voertuig updaten
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const vehicle = await Vehicle.findOne({ _id: id, userId: req.userId });
    if (!vehicle) {
      return res.status(404).json({ error: "Voertuig niet gevonden" });
    }

    // Voertuig bijwerken
    Object.assign(vehicle, updateData);
    await vehicle.save();

    res.json({ message: "Voertuig bijgewerkt", vehicle });
  } catch (error) {
    console.error("Fout bij updaten voertuig:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Voertuig verwijderen
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });
    if (!vehicle) {
      return res.status(404).json({ error: "Voertuig niet gevonden" });
    }

    res.json({ message: "Voertuig verwijderd" });
  } catch (error) {
    console.error("Fout bij verwijderen voertuig:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

module.exports = router;
