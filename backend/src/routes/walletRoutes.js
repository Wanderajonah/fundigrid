const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

router.get("/", protect, async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user.id });
    }
    res.json({ success: true, wallet });
  } catch (err) { next(err); }
});

router.get("/transactions", protect, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("transactions")
      .select("*")
      .eq("userId", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, transactions: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
