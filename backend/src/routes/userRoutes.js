const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { publicUser, profileExtras } = require("../controllers/authController");
const { isWeak } = require("../services/passwordPolicy");
const FundiProfile = require("../models/FundiProfile");

// A fundi handing over ID + trade paperwork joins the admin review queue.
// Re-submitting after a rejection does the same; a fundi already on the
// client map keeps their badge until an admin reviews them again.
async function requestVerification(user, { clearNote }) {
  const existing = await FundiProfile.findOne({ userId: user.id });
  const requestedAt = new Date().toISOString();
  if (!existing) {
    await FundiProfile.create({
      userId: user.id,
      skills: user.skills || [],
      verificationStatus: "pending",
      requestedAt,
    });
    return;
  }
  if (existing.verificationStatus === "verified") return;
  await FundiProfile.findByIdAndUpdate(existing.id, {
    verificationStatus: "pending",
    verified: false,
    ...(clearNote ? { verificationNotes: "" } : {}),
    requestedAt,
    reviewedAt: null,
  });
}

router.get("/profile", protect, async (req, res, next) => {
  try {
    // `hasPassword` lets the app skip the "choose a password" step for
    // accounts that already have one; `passwordWeak` asks them to upgrade a
    // password chosen before the current rules.
    res.json({
      success: true,
      hasPassword: Boolean(req.user.password),
      passwordWeak: isWeak(req.user.password),
      user: { ...publicUser(req.user), ...(await profileExtras(req.user)) },
    });
  } catch (err) { next(err); }
});

router.put("/update", protect, async (req, res, next) => {
  try {
    const allowed = ["firstName", "lastName", "gender", "email", "phone", "profilePhoto", "coverPhoto", "bio", "skills", "experience", "location", "locationLabel", "address", "district", "country", "searchRadiusKm", "onboardingComplete", "role", "availableDays", "availableStartTime", "availableEndTime", "serviceRadius", "verificationDocs", "portfolioImages", "isOnline", "referees"];
    const numeric = ["experience", "searchRadiusKm", "serviceRadius"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      let value = req.body[key];
      if (key === "portfolioImages") {
        // Work photos are base64 data URIs kept on the fundi's own row.
        if (req.user.role !== "fundi") {
          return res.status(403).json({ success: false, message: "Only fundis can add work photos." });
        }
        if (!Array.isArray(value)) {
          return res.status(400).json({ success: false, message: "portfolioImages must be an array." });
        }
        const images = value.filter((v) => typeof v === "string" && v.startsWith("data:image"));
        if (images.length !== value.length) {
          return res.status(400).json({ success: false, message: "Work photos must be image data." });
        }
        if (images.length > 6) {
          return res.status(400).json({ success: false, message: "You can keep up to 6 work photos." });
        }
        if (images.some((img) => img.length > 1500000)) {
          return res.status(400).json({ success: false, message: "A photo is too large. Pick a smaller image." });
        }
        value = images;
      } else if (numeric.includes(key)) {
        const n = typeof value === "number" ? value : parseFloat(String(value));
        if (!Number.isFinite(n)) {
          return res.status(400).json({ success: false, message: `${key} must be a number` });
        }
        value = n;
      } else if (key === "isOnline") {
        // The online/offline switch is a boolean no matter how it arrives.
        value = value === true || value === "true" || value === 1;
      } else if (key === "verificationDocs") {
        // ID cards and trade certificates: base64 image data the admin opens
        // in the review queue — a file:// path from the phone is no use there.
        if (req.user.role !== "fundi") {
          return res.status(403).json({ success: false, message: "Only fundis can upload verification documents." });
        }
        if (!Array.isArray(value)) {
          return res.status(400).json({ success: false, message: "verificationDocs must be an array." });
        }
        const docs = value.filter((v) => typeof v === "string" && v.startsWith("data:image"));
        if (docs.length !== value.length) {
          return res.status(400).json({ success: false, message: "Documents must be image data." });
        }
        if (docs.length > 6) {
          return res.status(400).json({ success: false, message: "You can upload up to 6 documents." });
        }
        if (docs.some((img) => img.length > 2500000)) {
          return res.status(400).json({ success: false, message: "A document is too large. Photograph it smaller." });
        }
        value = docs;
      } else if (key === "referees") {
        // Verification needs people we can call — store only clean entries.
        if (!Array.isArray(value)) {
          return res.status(400).json({ success: false, message: "referees must be an array." });
        }
        if (value.length > 5) {
          return res.status(400).json({ success: false, message: "You can keep up to 5 referees." });
        }
        const cleaned = value.map((r) => ({
          name: String(r?.name || "").trim(),
          phone: String(r?.phone || "").trim(),
          // Optional, but worth keeping — the app collects how we know them.
          relationship: String(r?.relationship || "").trim(),
        }));
        if (cleaned.some((r) => !r.name || !r.phone)) {
          return res.status(400).json({ success: false, message: "Each referee needs a name and phone number." });
        }
        value = cleaned;
      }
      updates[key] = value;
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // New paperwork moves the fundi into the admin's review queue.
    if (updates.verificationDocs !== undefined || updates.referees !== undefined) {
      await requestVerification(user, {
        clearNote: updates.verificationDocs !== undefined,
      });
    }
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) { next(err); }
});

router.put("/location", protect, async (req, res, next) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: "lat and lng must be numbers" });
    }
    const updates = { location: { lat, lng } };
    if (req.body.address !== undefined) updates.locationLabel = String(req.body.address);
    const user = await User.findByIdAndUpdate(req.user.id, updates);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) { next(err); }
});

router.get("/notifications", protect, async (req, res, next) => {
  try {
    const rows = await Notification.find({ userId: req.user.id });
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, notifications: rows });
  } catch (err) { next(err); }
});

router.get("/notifications/unread-count", protect, async (req, res, next) => {
  try {
    const all = await Notification.find({ userId: req.user.id });
    const count = all.filter((n) => !n.read).length;
    res.json({ success: true, count });
  } catch (err) { next(err); }
});

module.exports = router;
