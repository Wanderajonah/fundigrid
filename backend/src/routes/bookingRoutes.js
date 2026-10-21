const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Booking = require("../models/Booking");
const User = require("../models/User");
const FundiProfile = require("../models/FundiProfile");
const { buildEstimate, estimateFor } = require("../services/estimateService");
const { fullName } = require("../controllers/authController");
const { audit } = require("../services/auditService");

// The fundi drives the middle of the job. The first step (ACCEPTED) comes from
// /fundi/accept and the last word belongs to the client — see
// /client/confirm-completion.
const FUNDI_STATUSES = ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

// Every state a request passes through, oldest first.
const FLOW_STATUSES = ["PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

/**
 * Client-facing timeline for the direct client ↔ fundi flow:
 * submitted → fundi chosen → accepted → price agreed → work started → done.
 * Every step is read off the booking's own timestamps so the timeline tracks
 * the job however it moves.
 */
function progressSteps(booking) {
  const row = booking || {};
  const idx = FLOW_STATUSES.indexOf(row.status);
  const past = (status) => idx >= FLOW_STATUSES.indexOf(status);
  const accepted = Boolean(row.acceptedAt) || past("ACCEPTED");
  const started = Boolean(row.startedAt) || past("IN_PROGRESS");
  const completed = row.status === "COMPLETED" || Boolean(row.completedAt);

  const steps = [
    { key: "submitted", label: "Request submitted", at: row.created_at || null, done: true },
    { key: "fundi", label: "Fundi chosen", at: row.acceptedAt || null, done: Boolean(row.fundiId) },
    { key: "accepted", label: "Fundi accepted", at: row.acceptedAt || null, done: accepted },
    { key: "priced", label: "Price agreed", at: null, done: Boolean(row.priceAgreed) },
    { key: "started", label: "Work started", at: row.startedAt || null, done: started },
    {
      key: "completed",
      label: "Job completed",
      at: row.completedAt || row.fundiCompletedAt || null,
      done: completed,
    },
  ];

  // The first unfinished step is where the request is sitting right now.
  const current = steps.find((step) => !step.done);
  return steps.map((step) => ({
    ...step,
    status: step.done ? "completed" : step === current ? "current" : "pending",
  }));
}

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
      fundiName: fullName(req.user) || booking.fundiName || "",
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
    if (["CANCELLED", "DISPUTED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Job is already ${booking.status}.` });
    }
    // Work only starts on an agreed price — that is what the platform records
    // and takes its commission from.
    if (status === "IN_PROGRESS" && !booking.priceAgreed) {
      return res.status(409).json({
        success: false,
        message: "Send your quote and get the client's agreement before starting the job.",
      });
    }

    const now = new Date().toISOString();
    let updates;

    if (status === "COMPLETED") {
      // From the fundi this means "the work is finished" — the booking only
      // becomes COMPLETED once the client confirms it on their track screen.
      if (booking.fundiCompleted) {
        return res.status(400).json({
          success: false,
          message: "Already marked as finished — waiting for the client to confirm.",
        });
      }
      // Finishing before the work started would strand the job: the client can
      // only confirm once it has been driven all the way through.
      if (booking.status !== "IN_PROGRESS") {
        return res.status(400).json({
          success: false,
          message: "Start the job before marking it finished.",
        });
      }
      updates = { fundiCompleted: true, fundiCompletedAt: now };
    } else {
      if (booking.fundiCompleted) {
        return res.status(409).json({
          success: false,
          message: "The job is finished and waiting for the client to confirm.",
        });
      }
      updates = { status };
      if (status === "ON_THE_WAY") updates.onTheWayAt = now;
      if (status === "ARRIVED") updates.arrivedAt = now;
      if (status === "IN_PROGRESS") updates.startedAt = now;
    }

    const updated = await Booking.findByIdAndUpdate(bookingId, updates);
    audit(req, {
      action: status === "COMPLETED" ? "booking.fundi_finished" : "booking.status_changed",
      category: "bookings",
      entityType: "booking",
      entityId: bookingId,
      summary: status === "COMPLETED"
        ? `Marked ${booking.category || "a job"} as finished`
        : `Moved ${booking.category || "a job"} to ${status}`,
      meta: { from: booking.status, to: status, category: booking.category || "" },
    });
    res.json({ success: true, booking: updated, status: updated?.status ?? booking.status });
  } catch (err) { next(err); }
});

// The last word on a job: the client confirms what the fundi reported.
router.post("/client/confirm-completion", protect, async (req, res, next) => {
  try {
    const { bookingId } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    if (booking.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "This job is already completed." });
    }
    if (booking.status !== "IN_PROGRESS" || !booking.fundiCompleted) {
      return res.status(409).json({
        success: false,
        message: "You can confirm completion once the fundi marks the work as finished.",
      });
    }

    const now = new Date().toISOString();
    const updated = await Booking.findByIdAndUpdate(booking.id, {
      status: "COMPLETED",
      completedAt: now,
      clientCompleted: true,
      clientCompletedAt: now,
      fundiCompleted: true,
      fundiCompletedAt: booking.fundiCompletedAt || now,
    });

    // The fundi's finished-job counter feeds their dashboard and admin stats.
    if (booking.fundiId) {
      const profile = await FundiProfile.findOne({ userId: booking.fundiId });
      if (profile) {
        await FundiProfile.findByIdAndUpdate(profile.id, {
          jobsCompleted: Number(profile.jobsCompleted || 0) + 1,
        });
      } else {
        await FundiProfile.create({ userId: booking.fundiId, jobsCompleted: 1 });
      }
    }

    audit(req, {
      action: "booking.completed",
      category: "bookings",
      entityType: "booking",
      entityId: booking.id,
      summary: `Confirmed completion of ${booking.category || "a job"}`,
      meta: { category: booking.category || "", fundiId: booking.fundiId || null },
    });
    res.json({ success: true, booking: updated });
  } catch (err) { next(err); }
});

// ── Price quote ──────────────────────────────────────────────────────────
// The fundi prices the job once they have seen the site, the client accepts,
// and only then may work start. The agreed figure is what payment uses and
// what the platform records its commission from.

router.post("/fundi/quote", protect, requireFundi, async (req, res, next) => {
  try {
    const { bookingId, amount } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.fundiId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    if (["CANCELLED", "DISPUTED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Job is already ${booking.status}.` });
    }

    const price = Math.round(Number(amount));
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "Enter the amount to quote" });
    }

    // A fresh quote restarts the agreement: the client has to accept it again.
    const updated = await Booking.findByIdAndUpdate(booking.id, {
      proposedPrice: price,
      proposedBy: "FUNDI",
      clientPriceAgreed: false,
      fundiPriceAgreed: false,
      priceAgreed: false,
      agreedPrice: null,
    });
    audit(req, {
      action: "booking.quoted",
      category: "bookings",
      entityType: "booking",
      entityId: booking.id,
      summary: `Quoted ${price} for ${booking.category || "a job"}`,
      meta: { amount: price, category: booking.category || "" },
    });
    res.json({ success: true, booking: updated });
  } catch (err) { next(err); }
});

router.post("/client/price-response", protect, async (req, res, next) => {
  try {
    const { bookingId, action } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({ success: false, message: "Action must be accept or decline" });
    }
    if (!(Number(booking.proposedPrice) > 0)) {
      return res.status(400).json({ success: false, message: "There is no quote to respond to" });
    }

    if (action === "decline") {
      const updated = await Booking.findByIdAndUpdate(booking.id, {
        proposedPrice: null,
        proposedBy: null,
        clientPriceAgreed: false,
        fundiPriceAgreed: false,
        priceAgreed: false,
        agreedPrice: null,
      });
      audit(req, {
        action: "booking.quote_declined",
        category: "bookings",
        entityType: "booking",
        entityId: booking.id,
        summary: `Declined the quote on ${booking.category || "a job"}`,
        meta: { amount: Number(booking.proposedPrice), category: booking.category || "" },
      });
      return res.json({ success: true, booking: updated });
    }

    const agreed = Math.round(Number(booking.proposedPrice));
    // The fundi stands by their own quote, so the client's yes completes the
    // agreement on both sides.
    const updated = await Booking.findByIdAndUpdate(booking.id, {
      clientPriceAgreed: true,
      fundiPriceAgreed: true,
      priceAgreed: true,
      agreedPrice: agreed,
    });
    audit(req, {
      action: "booking.price_agreed",
      category: "bookings",
      entityType: "booking",
      entityId: booking.id,
      summary: `Agreed ${agreed} for ${booking.category || "a job"}`,
      meta: { amount: agreed, category: booking.category || "", proposedBy: booking.proposedBy || "FUNDI" },
    });
    res.json({ success: true, booking: updated });
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
      // The directory only lists verified fundis; don't let a hand-built
      // request slip an unreviewed one past that gate.
      const profile = await FundiProfile.findOne({ userId: fundi.id });
      if (!profile?.verified) {
        return res.status(400).json({ success: false, message: "This fundi has not been verified yet" });
      }
      fundiName = fullName(fundi) || "";
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
      // Rate-card figure kept on the booking purely as the amount payment falls
      // back to — the price the client actually pays is the one the fundi quotes.
      estimate: buildEstimate(category),
    });
    audit(req, {
      action: "booking.created",
      category: "bookings",
      entityType: "booking",
      entityId: booking.id,
      summary: `Booked ${category || "a service"}${fundiName ? ` with ${fundiName}` : ""}`,
      meta: { category: category || "", fundiId: fundiId || null },
    });
    res.json({ success: true, booking });
  } catch (err) { next(err); }
});

// The client deals with the fundi directly: this is the step that attaches a
// fundi to the request they already submitted.
router.post("/client/select-fundi", protect, async (req, res, next) => {
  try {
    const { bookingId, fundiId } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Request not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your request" });
    }
    if (["CANCELLED", "DISPUTED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Job is already ${booking.status}.` });
    }
    if (!fundiId) return res.status(400).json({ success: false, message: "Choose a fundi first" });

    const fundi = await User.findById(fundiId);
    if (!fundi || fundi.role !== "fundi" || fundi.status !== "active") {
      return res.status(400).json({ success: false, message: "Fundi not found or unavailable" });
    }
    const fundiProfile = await FundiProfile.findOne({ userId: fundi.id });
    if (!fundiProfile?.verified) {
      return res.status(400).json({ success: false, message: "This fundi has not been verified yet" });
    }

    const { scheduledFor } = req.body;
    let scheduled = booking.scheduledFor || null;
    if (scheduledFor) {
      const parsed = new Date(scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid scheduled date/time" });
      }
      scheduled = parsed.toISOString();
    }

    const updated = await Booking.findByIdAndUpdate(booking.id, {
      fundiId,
      // The tracking screen greets the client with this, so never leave it blank.
      fundiName: fullName(fundi) || String(fundi.phone || "").trim() || fundi.email || "Your fundi",
      ...(req.body.description !== undefined ? { description: String(req.body.description) } : {}),
      ...(req.body.address !== undefined ? { address: String(req.body.address) } : {}),
      ...(scheduledFor ? { scheduledFor: scheduled } : {}),
    });
    res.json({ success: true, booking: updated });
  } catch (err) { next(err); }
});

// What has happened to a request so far. The client's tracking screen polls
// this while the request waits for a fundi, then again as the job moves.
router.get("/progress/:id", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Request not found" });

    const user = req.user;
    const involved =
      booking.clientId === user.id ||
      booking.fundiId === user.id ||
      user.role === "admin";
    if (!involved) return res.status(403).json({ success: false, message: "Not your request" });

    res.json({
      success: true,
      booking,
      // There is no pricing gate any more — a request reaches fundis the
      // moment it is created.
      ready: true,
      steps: progressSteps(booking),
    });
  } catch (err) { next(err); }
});

// ── Demo: walk a booking through the fundi side of the flow ──
// Only answers when COMMS_DEV_MODE=true so it never ships to production.
// One tap = the fundi's next real action (accept → on the way → arrived →
// in progress → completed), complete with timestamps, a quote at the job's
// estimate once the site has been seen and a fake travelling location so the
// client's map has something to show.
const SIMULATION_FLOW = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

router.post("/simulate/advance", protect, async (req, res, next) => {
  try {
    if (process.env.COMMS_DEV_MODE !== "true") {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const { bookingId } = req.body || {};
    const booking = bookingId ? await Booking.findById(bookingId) : null;
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    // Only the assigned fundi (or an admin) may walk a job forward. The client
    // watches on their track screen and never drives these steps.
    const isAssignedFundi = req.user.role === "fundi" && booking.fundiId === req.user.id;
    if (!isAssignedFundi && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the fundi can move a job along" });
    }
    if (["CANCELLED", "DISPUTED", "COMPLETED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Job is already ${booking.status}.` });
    }
    if (booking.fundiCompleted) {
      return res.status(400).json({ success: false, message: "Finished — waiting for the client to confirm." });
    }

    const nextStatus = SIMULATION_FLOW[SIMULATION_FLOW.indexOf(booking.status) + 1] || "ACCEPTED";
    // Same gate as the real status route: no starting work on an unagreed price.
    if (nextStatus === "IN_PROGRESS" && !booking.priceAgreed) {
      return res.status(409).json({
        success: false,
        message: "Agree a price with the client before starting the job.",
      });
    }
    const now = new Date().toISOString();
    const updates = {};

    if (nextStatus === "COMPLETED") {
      // Report finished only — the client's confirmation sets COMPLETED.
      updates.fundiCompleted = true;
      updates.fundiCompletedAt = now;
    } else {
      updates.status = nextStatus;
    }

    if (nextStatus === "ACCEPTED") updates.acceptedAt = now;
    if (nextStatus === "ON_THE_WAY") updates.onTheWayAt = now;
    if (nextStatus === "ARRIVED") updates.arrivedAt = now;
    if (nextStatus === "IN_PROGRESS") updates.startedAt = now;
    // Arriving on site is when the fundi quotes — the demo agrees it straight
    // away so the flow can carry on into work and payment.
    if (nextStatus === "ARRIVED" && !booking.priceAgreed && !(Number(booking.proposedPrice) > 0)) {
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
