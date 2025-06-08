const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const jwt = require("jsonwebtoken");

// Middleware authenticatie
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// GET alle voertuigen van ingelogde gebruiker
router.get("/", authenticateToken, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST nieuw voertuig (voeg userId uit token toe)
router.post("/", authenticateToken, async (req, res) => {
  const { brand, model, year, plate, color } = req.body;

  if (!brand || !model || !year || !plate) {
    return res.status(400).json({ message: "Alle velden zijn verplicht" });
  }

  try {
    const existing = await Vehicle.findOne({ plate });
    if (existing) {
      return res.status(400).json({ message: "Kenteken bestaat al" });
    }

    const vehicle = new Vehicle({
      brand,
      model,
      year,
      plate,
      color: color || "",
      userId: req.userId,
    });

    const savedVehicle = await vehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// UPDATE voertuig
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Voertuig niet gevonden" });
    }
    if (vehicle.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Geen toegang tot dit voertuig" });
    }

    const { brand, model, year, plate, color } = req.body;

    if (brand !== undefined) vehicle.brand = brand;
    if (model !== undefined) vehicle.model = model;
    if (year !== undefined) vehicle.year = year;
    if (plate !== undefined) vehicle.plate = plate;
    if (color !== undefined) vehicle.color = color;

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE voertuig alleen als eigenaar
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Voertuig niet gevonden" });
    }
    if (vehicle.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Geen toegang tot dit voertuig" });
    }

    // Vervang vehicle.remove() door dit:
    await Vehicle.deleteOne({ _id: vehicle._id });

    res.json({ message: "Voertuig verwijderd" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
