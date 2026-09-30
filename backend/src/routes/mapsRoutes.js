const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { listFundis } = require("../services/fundiService");

router.get("/nearby-fundis", protect, async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, category, area } = req.query;
    const fundis = await listFundis({ lat, lng, radius, category, area });
    res.json({ success: true, fundis });
  } catch (err) { next(err); }
});

router.get("/route", protect, async (req, res, next) => {
  try {
    res.json({ success: true, route: null, message: "Google Maps route integration placeholder" });
  } catch (err) { next(err); }
});

module.exports = router;
