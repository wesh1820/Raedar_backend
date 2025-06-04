const express = require("express");
const router = express.Router();
const User = require("./user"); // pas pad aan indien nodig

// Middleware voor authenticatie (bijv. met JWT)
const authenticate = (req, res, next) => {
  // Dit is een voorbeeld, vervang met je eigen auth logica
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Niet geautoriseerd" });

  try {
    // jwt.verify(token, process.env.JWT_SECRET) => decoded
    // Simulatie: stel userId is in token
    req.userId = "67bf67600291c2bc78cfd97b"; // voorbeeld id, vervang dit
    next();
  } catch (err) {
    res.status(401).json({ message: "Token ongeldig" });
  }
};

// Endpoint om premium te activeren
router.post("/premium", authenticate, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { premium: true },
      { new: true }
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User niet gevonden" });

    res.json({
      success: true,
      message: "Premium account geactiveerd",
      user: updatedUser,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Kon premium niet activeren" });
  }
});

module.exports = router;
