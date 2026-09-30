const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Job = require("../models/Job");

router.get("/:userId", protect, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    let q = getSupabase().from("jobs").select("*");
    if (req.query.role === "fundi") q = q.eq("fundiId", req.params.userId);
    else q = q.eq("customerId", req.params.userId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, jobs: data || [] });
  } catch (err) { next(err); }
});

router.get("/detail/:jobId", protect, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

router.post("/", protect, async (req, res, next) => {
  try {
    const job = await Job.create({
      customerId: req.user.id,
      description: req.body.description || "",
      category: req.body.category || "",
      location: req.body.location || { lat: 0, lng: 0 },
      imageUrl: req.body.imageUrl || "",
      address: req.body.address || "",
      amount: req.body.amount || 0,
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

router.patch("/detail/:jobId/quote", protect, async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.jobId, {
      quoteAmount: req.body.quoteAmount || 0,
      fundiId: req.user.id,
      status: "quoted",
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

router.patch("/detail/:jobId/status", protect, async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.jobId, {
      status: req.body.status,
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

module.exports = router;
