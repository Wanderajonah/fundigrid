const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Booking = require("../models/Booking");
const User = require("../models/User");
const FundiProfile = require("../models/FundiProfile");
const PlatformSettings = require("../models/PlatformSettings");
const { buildSurveyEstimate } = require("../services/estimateService");
const { surveyStage, isAssignable, progressSteps, STAGES } = require("../services/surveyService");
const { fullName, normalisePhone } = require("../controllers/authController");

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin account required" });
  }
  next();
}

// Quantity surveyors are assigned by an admin but do the pricing themselves,
// so both may submit an estimate — the route still checks the assignment.
function requireEstimator(req, res, next) {
  if (req.user.role === "admin" || req.user.role === "surveyor") return next();
  res.status(403).json({ success: false, message: "Surveyor account required" });
}

router.get("/", (req, res) => {
  res.json({ success: true, message: "Admin API" });
});

// ── Quantity surveyors ──

router.get("/surveyors", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("users")
      .select("id, firstName, lastName, phone, email, status, profilePhoto, district, locationLabel, experience")
      .eq("role", "surveyor")
      .order("firstName", { ascending: true });
    if (error) throw error;
    res.json({ success: true, surveyors: data || [] });
  } catch (err) { next(err); }
});

// Requests sitting in the surveyor stage, newest first.
router.get("/requests", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    // NULL surveyStatus = written before the stage existed; surveyService reads
    // those as "estimate already ready", so the admin desk shows them too.
    const { data, error } = await getSupabase()
      .from("bookings")
      .select("*")
      .or(`surveyStatus.is.null,surveyStatus.in.(${STAGES.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = data || [];
    const clientIds = [...new Set(rows.map(r => r.clientId).filter(Boolean))];
    let clients = [];
    if (clientIds.length) {
      const { data: clientRows, error: clientError } = await getSupabase()
        .from("users")
        .select("id, firstName, lastName, phone")
        .in("id", clientIds);
      if (clientError) throw clientError;
      clients = clientRows || [];
    }
    const byId = new Map(clients.map(c => [c.id, c]));

    res.json({ success: true, requests: rows.map(row => {
      const client = byId.get(row.clientId);
      return {
        ...row,
        clientName: client ? fullName(client) || "Client" : "Client",
        clientPhone: client?.phone || "",
      };
    }) });
  } catch (err) { next(err); }
});

router.get("/requests/:id", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Request not found" });

    const user = req.user;
    if (user.role !== "admin" && booking.surveyorId !== user.id) {
      return res.status(403).json({ success: false, message: "This request is not assigned to you" });
    }

    let clientName = "Client";
    let clientPhone = "";
    if (booking.clientId) {
      const { getSupabase } = require("../config/supabase");
      const { data } = await getSupabase()
        .from("users")
        .select("id, firstName, lastName, phone")
        .eq("id", booking.clientId)
        .limit(1);
      const client = data && data[0];
      if (client) {
        clientName = fullName(client) || "Client";
        clientPhone = client.phone || "";
      }
    }

    res.json({
      success: true,
      booking: { ...booking, clientName, clientPhone },
      stage: surveyStage(booking),
      surveyorName: booking.surveyorName || "",
      estimate: booking.estimate || null,
      steps: progressSteps(booking),
    });
  } catch (err) { next(err); }
});

// Step 1 of the stage: point a request at a quantity surveyor.
router.post("/requests/:id/assign-surveyor", protect, requireAdmin, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Request not found" });
    if (!isAssignable(booking)) {
      return res.status(400).json({ success: false, message: "This request already has its estimate" });
    }

    const surveyor = await User.findById(String(req.body.surveyorId || ""));
    if (!surveyor || surveyor.role !== "surveyor" || surveyor.status !== "active") {
      return res.status(400).json({ success: false, message: "Surveyor not found or unavailable" });
    }

    const updated = await Booking.findByIdAndUpdate(booking.id, {
      surveyorId: surveyor.id,
      surveyorName: fullName(surveyor),
      surveyStatus: "SURVEYOR_ASSIGNED",
      assignedAt: new Date().toISOString(),
    });
    res.json({ success: true, booking: updated, steps: progressSteps(updated) });
  } catch (err) { next(err); }
});

// Step 2: the surveyor costed the job. This is what unlocks the fundis.
router.post("/requests/:id/estimate", protect, requireEstimator, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Request not found" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && booking.surveyorId !== req.user.id) {
      return res.status(403).json({ success: false, message: "This request is assigned to another surveyor" });
    }
    if (!booking.surveyorId) {
      return res.status(400).json({ success: false, message: "Assign a surveyor before submitting an estimate" });
    }

    const labour = Number(req.body.labour);
    const materials = Number(req.body.materials);
    if (!Number.isFinite(labour) || labour < 0 || !Number.isFinite(materials) || materials < 0) {
      return res.status(400).json({ success: false, message: "Labour and materials must be amounts" });
    }

    const estimate = buildSurveyEstimate({
      category: booking.category,
      labour,
      materials,
      serviceFee: req.body.serviceFee,
      notes: req.body.notes,
    });
    if (!(estimate.total > 0)) {
      return res.status(400).json({ success: false, message: "An estimate needs at least one amount" });
    }

    const updated = await Booking.findByIdAndUpdate(booking.id, {
      estimate,
      surveyStatus: "ESTIMATE_READY",
      estimateSubmittedAt: new Date().toISOString(),
      estimateBy: req.user.id,
    });
    res.json({ success: true, booking: updated, estimate, steps: progressSteps(updated) });
  } catch (err) { next(err); }
});

// ── Users ────────────────────────────────────────────────────────────────

const USER_FIELDS =
  "id, firstName, lastName, phone, email, role, status, skills, district, locationLabel, experience, bio, created_at";

function roleLabel(role) {
  if (role === "fundi") return "Fundi";
  if (role === "surveyor") return "Surveyor";
  if (role === "admin") return "Admin";
  return "Client";
}

function shortLabel(text) {
  const value = String(text || "").trim();
  return value ? value.split(",")[0].trim() : "";
}

function toAdminUser(row) {
  return {
    id: row.id,
    name: fullName(row) || row.email || row.phone || "User",
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    role: roleLabel(row.role),
    rawRole: row.role,
    phone: row.phone || "",
    email: row.email || "",
    location: row.district || shortLabel(row.locationLabel),
    skills: Array.isArray(row.skills) ? row.skills : [],
    createdAt: row.created_at || null,
    status: row.status === "active" ? "Active" : "Inactive",
  };
}

router.get("/users", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("users")
      .select(USER_FIELDS)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json({ success: true, users: (data || []).map(toAdminUser) });
  } catch (err) { next(err); }
});

// Add an account straight to the database — no OTP round-trip, marked verified.
router.post("/users", protect, requireAdmin, async (req, res, next) => {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const phone = normalisePhone(req.body.phone);
    const email = String(req.body.email || "").trim() || null;
    const role = ["customer", "fundi", "surveyor", "admin"].includes(req.body.role)
      ? req.body.role
      : "customer";
    const skills = (Array.isArray(req.body.skills)
      ? req.body.skills
      : String(req.body.skills || "").split(","))
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    const district = String(req.body.district || "").trim();

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: "First and last name are required" });
    }
    if (phone.length < 9) {
      return res.status(400).json({ success: false, message: "Enter a valid phone number" });
    }
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: "That phone number already has an account" });
    }

    const user = await User.create({
      firstName,
      lastName,
      phone,
      email,
      role,
      status: "active",
      phoneVerified: true,
      onboardingComplete: true,
      skills,
      district,
      ...(role === "fundi" ? { fundiEnabled: true } : {}),
    });

    if (role === "fundi") {
      const profiles = await FundiProfile.find({ userId: user.id });
      if (!profiles.length) {
        await FundiProfile.create({
          userId: user.id,
          skills,
          verificationStatus: "pending",
        });
      }
    }

    res.status(201).json({ success: true, user: toAdminUser(user) });
  } catch (err) { next(err); }
});

router.patch("/users/:id", protect, requireAdmin, async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });

    const status = String(req.body.status || "");
    if (status !== "active" && status !== "inactive") {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }
    if (String(target.id) === String(req.user.id) && status !== "active") {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
    }

    const updated = await User.findByIdAndUpdate(target.id, { status });
    res.json({ success: true, user: toAdminUser(updated || { ...target, status }) });
  } catch (err) { next(err); }
});

router.delete("/users/:id", protect, requireAdmin, async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    if (String(target.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }
    if (target.role === "admin") {
      const admins = await User.find({ role: "admin" });
      if ((admins || []).length <= 1) {
        return res.status(400).json({ success: false, message: "Keep at least one admin account" });
      }
    }
    const hasHistory =
      (await Booking.findOne({ clientId: target.id })) ||
      (await Booking.findOne({ fundiId: target.id }));
    if (hasHistory) {
      return res.status(409).json({
        success: false,
        message: "This account has job history — deactivate it instead of deleting",
      });
    }

    // Profile rows point at the user, so they go first — otherwise the foreign
    // key blocks the delete and the admin only sees a generic failure.
    if (target.role === "fundi") await FundiProfile.deleteOne({ userId: target.id });
    await User.deleteOne({ id: target.id });
    res.json({ success: true, id: target.id });
  } catch (err) {
    if (err && err.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "This account is linked to existing records — deactivate it instead",
      });
    }
    next(err);
  }
});

// ── Fundis ───────────────────────────────────────────────────────────────

function toAdminFundi(user, profile) {
  const skills = [...new Set([...(user.skills || []), ...(profile?.skills || [])])]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const active = user.status === "active";
  return {
    id: user.id,
    name: fullName(user) || user.phone || "Fundi",
    trade: skills[0] || "Fundi",
    skills,
    location: user.district || shortLabel(user.locationLabel) || "Uganda",
    rating: Number(profile?.rating ?? 0),
    reviews: Number(profile?.jobsCompleted ?? 0),
    status: !active ? "Suspended" : profile?.verificationStatus === "pending" ? "Pending" : "Active",
    phone: user.phone || "",
    email: user.email || "",
    createdAt: user.created_at || null,
    experience: Number(profile?.experience ?? user.experience ?? 0),
    completedJobs: Number(profile?.jobsCompleted ?? 0),
    availability: active && profile?.isAvailable !== false ? "Available" : "Unavailable",
    about: profile?.bio || user.bio || "No bio yet.",
    verified: Boolean(profile?.verified),
  };
}

router.get("/fundis", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const sb = getSupabase();
    const [usersRes, profilesRes] = await Promise.all([
      sb.from("users")
        .select(`${USER_FIELDS}, fundiEnabled`)
        .eq("role", "fundi")
        .order("created_at", { ascending: false })
        .limit(500),
      sb.from("fundiprofiles")
        .select('userId, skills, experience, bio, rating, "jobsCompleted", "verificationStatus", verified, "isAvailable"'),
    ]);
    if (usersRes.error) throw usersRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const byUser = new Map((profilesRes.data || []).map((p) => [p.userId, p]));
    res.json({
      success: true,
      fundis: (usersRes.data || []).map((u) => toAdminFundi(u, byUser.get(u.id))),
    });
  } catch (err) { next(err); }
});

router.patch("/fundis/:id", protect, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "fundi") {
      return res.status(404).json({ success: false, message: "Fundi not found" });
    }
    const status = String(req.body.status || "");
    if (status !== "active" && status !== "inactive") {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }
    if (String(user.id) === String(req.user.id) && status !== "active") {
      return res.status(400).json({ success: false, message: "You cannot suspend your own account" });
    }

    await User.findByIdAndUpdate(user.id, { status });
    const profiles = await FundiProfile.find({ userId: user.id });
    const profile = (profiles || [])[0];
    res.json({ success: true, fundi: toAdminFundi({ ...user, status }, profile) });
  } catch (err) { next(err); }
});

// ── Bookings ─────────────────────────────────────────────────────────────

function bookingPrice(booking) {
  const price =
    booking.agreedPrice ??
    (booking.estimate && booking.estimate.total) ??
    booking.proposedPrice ??
    0;
  return Number(price) || 0;
}

function bookingStatusLabel(status) {
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "PENDING") return "Pending";
  if (status === "ACCEPTED") return "Accepted";
  return "In Progress"; // ON_THE_WAY, ARRIVED, IN_PROGRESS
}

router.get("/bookings", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const sb = getSupabase();
    const { data, error } = await sb
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;

    const rows = data || [];
    const people = [
      ...new Set(rows.flatMap((r) => [r.clientId, r.fundiId]).filter(Boolean)),
    ];
    let peopleRows = [];
    if (people.length) {
      const res2 = await sb
        .from("users")
        .select("id, firstName, lastName, phone")
        .in("id", people);
      if (res2.error) throw res2.error;
      peopleRows = res2.data || [];
    }
    const byId = new Map(peopleRows.map((p) => [p.id, p]));

    res.json({
      success: true,
      bookings: rows.map((row) => ({
        id: row.id,
        category: row.category || "Service",
        clientId: row.clientId || "",
        client: row.clientId
          ? fullName(byId.get(row.clientId)) || "Client"
          : "Client",
        fundiId: row.fundiId || "",
        fundi: row.fundiId
          ? fullName(byId.get(row.fundiId)) || row.fundiName || "Unassigned"
          : "Unassigned",
        address: row.address || "",
        amount: bookingPrice(row),
        status: bookingStatusLabel(row.status),
        surveyStatus: surveyStage(row),
        createdAt: row.created_at || null,
      })),
    });
  } catch (err) { next(err); }
});

// ── Platform-wide numbers behind the dashboard and reports ───────────────

router.get("/stats", protect, requireAdmin, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const sb = getSupabase();
    const [usersRes, bookingsRes, profilesRes] = await Promise.all([
      sb.from("users").select("id, role, status"),
      sb.from("bookings")
        .select('id, category, status, "surveyStatus", agreedPrice, proposedPrice, estimate, created_at')
        .order("created_at", { ascending: false })
        .limit(500),
      sb.from("fundiprofiles").select('userId, "verificationStatus"'),
    ]);
    if (usersRes.error) throw usersRes.error;
    if (bookingsRes.error) throw bookingsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const users = usersRes.data || [];
    const rows = bookingsRes.data || [];
    const pendingFundiIds = new Set(
      (profilesRes.data || [])
        .filter((p) => p.verificationStatus === "pending")
        .map((p) => p.userId),
    );

    const userCounts = { total: users.length, clients: 0, fundis: 0, surveyors: 0, admins: 0, active: 0, activeFundis: 0, pendingFundis: 0 };
    users.forEach((u) => {
      if (u.status === "active") userCounts.active += 1;
      if (u.role === "fundi") {
        userCounts.fundis += 1;
        if (u.status === "active") userCounts.activeFundis += 1;
        if (pendingFundiIds.has(u.id)) userCounts.pendingFundis += 1;
      } else if (u.role === "surveyor") userCounts.surveyors += 1;
      else if (u.role === "admin") userCounts.admins += 1;
      else userCounts.clients += 1;
    });

    const stage = { awaiting: 0, assigned: 0, ready: 0, completed: 0, cancelled: 0, active: 0 };
    const byService = {};
    let completedValue = 0;
    rows.forEach((row) => {
      const service = row.category || "Service";
      byService[service] = (byService[service] || 0) + 1;
      if (row.status === "COMPLETED") {
        stage.completed += 1;
        completedValue += bookingPrice(row);
      } else if (row.status === "CANCELLED") {
        stage.cancelled += 1;
      } else {
        stage.active += 1;
        const s = surveyStage(row);
        if (s === "SURVEYOR_ASSIGNED") stage.assigned += 1;
        else if (s === "ESTIMATE_READY") stage.ready += 1;
        else stage.awaiting += 1;
      }
    });

    res.json({
      success: true,
      stats: {
        users: userCounts,
        requests: {
          total: rows.length,
          awaiting: stage.awaiting,
          assigned: stage.assigned,
          ready: stage.ready,
          completed: stage.completed,
          cancelled: stage.cancelled,
          active: stage.active,
          byService: Object.entries(byService)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value),
        },
        bookings: {
          total: rows.length,
          active: stage.active,
          completed: stage.completed,
          cancelled: stage.cancelled,
          completedValue,
        },
      },
    });
  } catch (err) { next(err); }
});

// ── Platform settings ────────────────────────────────────────────────────

router.put("/platform-settings", protect, requireAdmin, async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) settings = await PlatformSettings.create({});

    const text = ["adminName", "adminEmail", "autoApprovalFundis", "disputeResolution"];
    const numbers = ["commissionRate", "clientFeeRate", "minJobAmount", "serviceRadius"];
    let changed = false;

    text.forEach((key) => {
      if (typeof req.body[key] === "string") {
        settings[key] = req.body[key].trim();
        changed = true;
      }
    });
    numbers.forEach((key) => {
      if (req.body[key] !== undefined && req.body[key] !== "") {
        const value = Number(req.body[key]);
        if (Number.isFinite(value) && value >= 0) {
          settings[key] = value;
          changed = true;
        }
      }
    });

    // Toggle preferences and payment details ride on the two jsonb columns the
    // table already has, so the settings screen has somewhere to put them.
    if (Array.isArray(req.body.notifications)) {
      settings.notifications = req.body.notifications;
      changed = true;
    }
    if (req.body.paymentIntegrations && typeof req.body.paymentIntegrations === "object") {
      settings.paymentIntegrations = req.body.paymentIntegrations;
      changed = true;
    }

    if (changed) await settings.save();

    res.json({
      success: true,
      settings: {
        adminName: settings.adminName,
        adminEmail: settings.adminEmail,
        commissionRate: settings.commissionRate,
        clientFeeRate: settings.clientFeeRate,
        minJobAmount: settings.minJobAmount,
        serviceRadius: settings.serviceRadius,
        autoApprovalFundis: settings.autoApprovalFundis,
        disputeResolution: settings.disputeResolution,
        notifications: settings.notifications || [],
        paymentIntegrations: settings.paymentIntegrations || [],
        currency: "UGX",
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
