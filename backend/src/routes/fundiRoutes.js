const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { listFundis, getFundi } = require("../services/fundiService");
const Booking = require("../models/Booking");

router.get("/", protect, async (req, res, next) => {
  try {
    const { lat, lng, radius, category, area } = req.query;
    const fundis = await listFundis({ lat, lng, radius, category, area });
    res.json({ success: true, fundis });
  } catch (err) { next(err); }
});

router.get("/:id", protect, async (req, res, next) => {
  try {
    const fundi = await getFundi(req.params.id);
    if (!fundi) return res.status(404).json({ success: false, message: "Fundi not found" });

    // Only a client who actually booked this fundi gets the number to call.
    let phone;
    if (req.user && req.user.id) {
      const bookings = await Booking.find({ clientId: req.user.id, fundiId: String(fundi.id) });
      if (bookings && bookings.length) {
        const { getSupabase } = require("../config/supabase");
        const { data } = await getSupabase().from("users").select("phone").eq("id", fundi.id).limit(1);
        phone = data && data[0] ? data[0].phone : undefined;
      }
    }

    res.json({ success: true, fundi: { ...fundi, phone } });
  } catch (err) { next(err); }
});

module.exports = router;
