const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const jwt = require("jsonwebtoken");

// Authentication middleware
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

// GET all vehicles of the logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new vehicle (adds userId from token)
router.post("/", authenticateToken, async (req, res) => {
  const { brand, model, year, plate, color } = req.body;

  if (!brand || !model || !year || !plate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existing = await Vehicle.findOne({ plate });
    if (existing) {
      return res.status(400).json({ message: "License plate already exists" });
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

// UPDATE vehicle
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied to this vehicle" });
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

// DELETE vehicle (only if owner)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied to this vehicle" });
    }

    await Vehicle.deleteOne({ _id: vehicle._id });

    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
