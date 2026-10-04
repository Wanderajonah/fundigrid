const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { fullName } = require("../controllers/authController");

function requireSurveyor(req, res, next) {
  if (req.user.role !== "surveyor") {
    return res.status(403).json({ success: false, message: "Surveyor account required" });
  }
  next();
}

// The requests sitting on this surveyor's desk, newest assignment first.
router.get("/requests", protect, requireSurveyor, async (req, res, next) => {
  try {
    const { getSupabase } = require("../config/supabase");
    const { data, error } = await getSupabase()
      .from("bookings")
      .select("*")
      .eq("surveyorId", req.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
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

    res.json({
      success: true,
      requests: rows.map(row => {
        const client = byId.get(row.clientId);
        return {
          ...row,
          clientName: client ? fullName(client) || "Client" : "Client",
          clientPhone: client?.phone || "",
        };
      }),
    });
  } catch (err) { next(err); }
});

module.exports = router;
