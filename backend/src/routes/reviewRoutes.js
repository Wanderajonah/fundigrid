const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Review = require("../models/Review");

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

module.exports = router;
