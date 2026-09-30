const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "AI API placeholder" });
});

module.exports = router;
