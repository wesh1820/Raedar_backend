const express = require("express");
const router = express.Router();
const Event = require("../models/Event"); // Adjust path if needed

// ✅ Route to get all categories with their events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    console.log("Fetched Events:", events);
    res.json(events);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ✅ PATCH route to update an event's 'populair' field in a nested structure
router.patch("/:categoryId", async (req, res) => {
  const { categoryId } = req.params;
  const { title, populair } = req.body;

  // Validate populair value
  if (typeof populair !== "number") {
    return res.status(400).json({ error: "Populair moet een getal zijn" });
  }

  try {
    // Find the category document by ID
    const category = await Event.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Categorie niet gevonden" });
    }

    // Find the event inside the category by title
    const event = category.events.find((e) => e.title === title);
    if (!event) {
      return res.status(404).json({ error: "Evenement niet gevonden" });
    }

    // Update the populair value
    event.populair = populair;
    await category.save();

    res.status(200).json({ message: "Populair status bijgewerkt", event });
  } catch (error) {
    console.error("❌ Error updating popular status:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

module.exports = router;
