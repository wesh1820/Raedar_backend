const express = require("express");
const router = express.Router();
const Event = require("../models/Event"); // Zorg ervoor dat dit het juiste pad naar je Event model is

// Route om alle evenementen op te halen
router.get("/", async (req, res) => {
  try {
    const events = await Event.find(); // Haal alle evenementen op
    console.log("Fetched Events:", events); // Log de evenementen om te zien of ze worden opgehaald
    res.json(events); // Stuur de data terug in JSON-formaat
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Nieuwe PATCH route om de 'populair' status van een evenement bij te werken
router.patch("/:id", async (req, res) => {
  const { id } = req.params; // Haal het evenement ID uit de URL
  const { populair } = req.body; // Haal de 'populair' waarde uit de request body

  // Controleer of de populair waarde een geldig getal is
  if (typeof populair !== "number") {
    return res.status(400).json({ error: "Populair moet een getal zijn" });
  }

  try {
    const event = await Event.findById(id); // Zoek het evenement op basis van het ID
    if (!event) {
      return res.status(404).json({ error: "Evenement niet gevonden" });
    }

    // Werk de 'populair' status bij
    event.populair = populair;
    await event.save(); // Sla de wijzigingen op in de database

    res.status(200).json(event); // Stuur het bijgewerkte evenement terug
  } catch (error) {
    console.error("❌ Error updating popular status:", error);
    return res.status(500).json({ error: "Interne serverfout" });
  }
});

module.exports = router;
