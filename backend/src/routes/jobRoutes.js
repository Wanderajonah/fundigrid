const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Job = require("../models/Job");
const { audit } = require("../services/auditService");

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
    audit(req, {
      action: "job.created",
      category: "jobs",
      entityType: "job",
      entityId: job.id,
      summary: `Created a ${job.category || "service"} request`,
      meta: { category: job.category || "", amount: job.amount || 0 },
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
    audit(req, {
      action: "job.quoted",
      category: "jobs",
      entityType: "job",
      entityId: req.params.jobId,
      summary: `Quoted ${req.body.quoteAmount || 0} for a ${job.category || "service"} request`,
      meta: { quoteAmount: req.body.quoteAmount || 0, category: job.category || "" },
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

router.patch("/detail/:jobId/status", protect, async (req, res, next) => {
  try {
    const before = await Job.findById(req.params.jobId);
    const job = await Job.findByIdAndUpdate(req.params.jobId, {
      status: req.body.status,
    });
    audit(req, {
      action: "job.status_changed",
      category: "jobs",
      entityType: "job",
      entityId: req.params.jobId,
      summary: `Moved a ${job.category || "service"} request from ${before ? before.status : "unknown"} to ${job.status}`,
      meta: { from: before ? before.status : null, to: job.status },
    });
    res.json({ success: true, job });
  } catch (err) { next(err); }
});

module.exports = router;
