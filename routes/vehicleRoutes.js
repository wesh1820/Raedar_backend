const express = require("express");
const router = express.Router();
const Vehicle = require("../models/vehicle");

// Voorbeeld middleware om `req.userId` te verkrijgen. In praktijk gebruik je auth middleware (zoals JWT)
const mockAuthMiddleware = (req, res, next) => {
  req.userId = "665b5cfb8e1ec0f34a6e02ef"; // Gebruik je echte user ID hier
  next();
};

router.use(mockAuthMiddleware);

// 🚗 GET alle voertuigen van de gebruiker
router.get("/", async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// 🚗 POST nieuw voertuig toevoegen
router.post("/", async (req, res) => {
  try {
    const { make, model, year, licensePlate, color } = req.body;

    const vehicle = new Vehicle({
      userId: req.userId,
      make,
      model,
      year,
      licensePlate,
      color,
    });

    const saved = await vehicle.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Kenteken is al in gebruik." });
    }
    res.status(500).json({ message: "Server error", error });
  }
});

// 🚗 DELETE voertuig
router.delete("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Voertuig niet gevonden" });
    }

    res.status(200).json({ message: "Voertuig verwijderd" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
