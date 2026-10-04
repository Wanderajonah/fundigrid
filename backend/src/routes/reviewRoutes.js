const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Review = require("../models/Review");
const FundiProfile = require("../models/FundiProfile");
const Booking = require("../models/Booking");
const User = require("../models/User");

// fundiprofiles.rating is what every profile screen renders, so it is
// recomputed from the stored reviews whenever one changes.
async function recomputeRating(fundiId) {
  const { getSupabase } = require("../config/supabase");
  const { data } = await getSupabase().from("reviews").select("rating").eq("fundiId", fundiId);
  const rows = data || [];
  const rating = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length
    : 0;
  const profile = await FundiProfile.findOne({ userId: fundiId });
  if (profile) {
    await FundiProfile.findByIdAndUpdate(profile.id, { rating });
  } else {
    await FundiProfile.create({ userId: fundiId, rating });
  }
  return rating;
}

router.get("/:fundiId", protect, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("reviews")
      .select("*")
      .eq("fundiId", req.params.fundiId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, reviews: data || [] });
  } catch (err) { next(err); }
});

// Submitting a review. The booking decides who the fundi is — the client only
// sends the booking id — and the fundi's average rating is refreshed with it.
router.post("/", protect, async (req, res, next) => {
  try {
    const { bookingId, fundiId, rating, comment = "", service = "" } = req.body || {};
    const stars = Number(rating);
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: "Choose a rating between 1 and 5 stars." });
    }

    let targetFundiId = fundiId ? String(fundiId) : "";
    let serviceName = String(service || "").slice(0, 120);
    let amount = 0;
    let booking = null;

    if (bookingId) {
      booking = await Booking.findById(String(bookingId));
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
      if (booking.clientId !== req.user.id) {
        return res.status(403).json({ success: false, message: "You can only review your own jobs." });
      }
      if (booking.status === "CANCELLED") {
        return res.status(400).json({ success: false, message: "Cancelled jobs cannot be reviewed." });
      }
      if (booking.fundiId) targetFundiId = booking.fundiId;
      if (!serviceName) serviceName = String(booking.category || "").slice(0, 120);
      amount = Number(booking.agreedPrice || 0);
    }

    if (!targetFundiId) {
      return res.status(400).json({ success: false, message: "There is no fundi to review." });
    }
    const fundi = await User.findById(targetFundiId);
    if (!fundi || fundi.role !== "fundi") {
      return res.status(400).json({ success: false, message: "Fundi not found." });
    }

    const payload = {
      fundiId: targetFundiId,
      customerId: req.user.id,
      jobId: null,
      rating: stars,
      comment: String(comment || "").slice(0, 2000),
      service: serviceName,
      amount,
      bookingId: bookingId ? String(bookingId) : null,
    };

    // Re-submitting from the completion screen corrects the earlier rating
    // instead of stacking a second row on top of it.
    let existing = null;
    if (payload.bookingId) {
      try {
        existing = await Review.findOne({
          customerId: payload.customerId,
          fundiId: payload.fundiId,
          bookingId: payload.bookingId,
        });
      } catch {
        existing = null; // databases migrated before bookingId existed
      }
    }

    let review;
    if (existing) {
      review = await Review.findByIdAndUpdate(existing.id, {
        rating: stars,
        comment: payload.comment,
        service: serviceName,
        updated_at: new Date().toISOString(),
      });
    } else {
      try {
        review = await Review.create(payload);
      } catch {
        const { bookingId: _bookingId, ...withoutBooking } = payload;
        review = await Review.create(withoutBooking);
      }
    }

    const average = await recomputeRating(targetFundiId);
    res.json({ success: true, review, rating: average });
  } catch (err) { next(err); }
});

module.exports = router;
