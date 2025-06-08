const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET all vehicles
router.get("/", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Voertuig niet gevonden" });
    }
    await vehicle.remove();
    res.json({ message: "Voertuig verwijderd" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new vehicle
router.post("/", async (req, res) => {
  const { brand, model, year, plate, color, userId } = req.body;

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
      userId: userId || null,
    });

    const savedVehicle = await vehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
