const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { buildEstimate, estimateFor } = require("../services/estimateService");

const FUNDI_STATUSES = ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

function requireFundi(req, res, next) {
  if (req.user.role !== "fundi") {
    return res.status(403).json({ success: false, message: "Fundi account required" });
  }
  next();
}

router.get("/fundi/bookings", protect, requireFundi, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("bookings")
      .select("*")
      .eq("fundiId", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, bookings: data || [] });
  } catch (err) { next(err); }
});

router.get("/fundi/bookings/:id", protect, requireFundi, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.fundiId && booking.fundiId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

router.post("/fundi/accept", protect, requireFundi, async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.status !== "PENDING") return res.status(400).json({ success: false, message: "Booking not available" });
    if (booking.fundiId && booking.fundiId !== req.user.id) {
      return res.status(403).json({ success: false, message: "This booking was requested from another fundi" });
    }

    await Booking.findByIdAndUpdate(bookingId, {
      fundiId: req.user.id,
      fundiName: req.user.name || booking.fundiName || "",
      status: "ACCEPTED",
      acceptedAt: new Date().toISOString(),
      expiresAt: null,
    });
    res.json({ success: true, message: "Booking accepted" });
  } catch (err) { next(err); }
});

router.post("/fundi/decline", protect, requireFundi, async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.fundiId && booking.fundiId !== req.user.id) {
      return res.status(403).json({ success: false, message: "This booking was requested from another fundi" });
    }
    await Booking.findByIdAndUpdate(bookingId, { status: "CANCELLED", cancelledBy: "FUNDI", cancelledAt: new Date().toISOString() });
    res.json({ success: true, message: "Booking declined" });
  } catch (err) { next(err); }
});

router.put("/fundi/status", protect, requireFundi, async (req, res, next) => {
  try {
    const { bookingId, status } = req.body;
    if (!FUNDI_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.fundiId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    const updates = { status };
    if (status === "ON_THE_WAY") updates.onTheWayAt = new Date().toISOString();
    if (status === "ARRIVED") updates.arrivedAt = new Date().toISOString();
    if (status === "IN_PROGRESS") updates.startedAt = new Date().toISOString();
    if (status === "COMPLETED") {
      updates.completedAt = new Date().toISOString();
      updates.fundiCompleted = true;
      updates.fundiCompletedAt = new Date().toISOString();
    }
    await Booking.findByIdAndUpdate(bookingId, updates);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get("/client/bookings", protect, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("bookings")
      .select("*")
      .eq("clientId", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, bookings: data || [] });
  } catch (err) { next(err); }
});

router.post("/client/create", protect, async (req, res, next) => {
  try {
    const { fundiId, scheduledFor } = req.body;

    let fundiName = "";
    const fundi = fundiId ? await User.findById(fundiId) : null;
    if (fundiId) {
      if (!fundi || fundi.role !== "fundi" || fundi.status !== "active") {
        return res.status(400).json({ success: false, message: "Fundi not found or unavailable" });
      }
      fundiName = fundi.name || "";
    }

    // Category is the filter clients search fundis by — derive it from the
    // fundi's own skills when the caller did not send one.
    let category = String(req.body.category || "").trim();
    if (!category && Array.isArray(fundi?.skills) && fundi.skills.length) {
      category = String(fundi.skills[0]).trim();
    }

    let scheduled = null;
    if (scheduledFor) {
      const parsed = new Date(scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid scheduled date/time" });
      }
      scheduled = parsed.toISOString();
    }

    const booking = await Booking.create({
      clientId: req.user.id,
      fundiId: fundiId || null,
      fundiName,
      scheduledFor: scheduled,
      category,
      description: req.body.description || "",
      address: req.body.address || "",
      location: req.body.location || { lat: 0, lng: 0 },
      images: req.body.images || [],
      estimatedDuration: req.body.estimatedDuration || 60,
      estimate: buildEstimate(category),
    });
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// Cost preview for the confirm screen — same math the booking gets stored with.
router.get("/estimate", protect, async (req, res, next) => {
  try {
    res.json({ success: true, estimate: buildEstimate(req.query.category || "") });
  } catch (err) { next(err); }
});

// ── Demo: walk a booking through the fundi side of the flow ──
// Only answers when COMMS_DEV_MODE=true so it never ships to production.
// One tap = the fundi's next real action (accept → on the way → arrived →
// in progress → completed), complete with timestamps, a quote at the job's
// estimate and a fake travelling location so the client's map has something
// to show.
const SIMULATION_FLOW = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

router.post("/simulate/advance", protect, async (req, res, next) => {
  try {
    if (process.env.COMMS_DEV_MODE !== "true") {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const { bookingId } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    if (["CANCELLED", "DISPUTED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Job is already ${booking.status}.` });
    }

    const nextStatus = SIMULATION_FLOW[SIMULATION_FLOW.indexOf(booking.status) + 1] || "ACCEPTED";
    const now = new Date().toISOString();
    const updates = { status: nextStatus };

    if (nextStatus === "ACCEPTED") updates.acceptedAt = now;
    if (nextStatus === "ON_THE_WAY") updates.onTheWayAt = now;
    if (nextStatus === "ARRIVED") updates.arrivedAt = now;
    if (nextStatus === "IN_PROGRESS") updates.startedAt = now;
    if (nextStatus === "COMPLETED") {
      updates.completedAt = now;
      updates.fundiCompleted = true;
      updates.fundiCompletedAt = now;
    }

    // Fundi accepts at the job's estimate: payment then has a real amount.
    if (nextStatus === "ACCEPTED" && !(Number(booking.agreedPrice) > 0) && !(Number(booking.proposedPrice) > 0)) {
      const quoted = estimateFor(booking).total;
      updates.proposedPrice = quoted;
      updates.agreedPrice = quoted;
      updates.priceAgreed = true;
      updates.proposedBy = "FUNDI";
      updates.clientPriceAgreed = true;
      updates.fundiPriceAgreed = true;
    }

    // Fake live location while travelling, parked on the job once working.
    const job = booking.location && Number(booking.location.lat) ? booking.location : null;
    if (job && (nextStatus === "ON_THE_WAY" || nextStatus === "ARRIVED")) {
      const spread = nextStatus === "ON_THE_WAY" ? 0.02 : 0.002;
      updates.fundiLocation = {
        lat: Number(job.lat) + spread,
        lng: Number(job.lng) + spread * 0.8,
      };
    } else if (job && (nextStatus === "IN_PROGRESS" || nextStatus === "COMPLETED")) {
      updates.fundiLocation = { lat: Number(job.lat), lng: Number(job.lng) };
    }

    const updated = await Booking.findByIdAndUpdate(booking.id, updates);
    res.json({ success: true, status: nextStatus, booking: updated });
  } catch (err) { next(err); }
});

module.exports = router;
