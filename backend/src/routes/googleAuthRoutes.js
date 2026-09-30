const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: "idToken required" });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Link google account
        const { getSupabase } = require("../config/supabase");
        await getSupabase().from("users").update({ googleId, profilePhoto: picture || "" }).eq("id", user.id);
        user.googleId = googleId;
      } else {
        user = await User.create({
          name: name || "",
          email,
          googleId,
          profilePhoto: picture || "",
          role: "customer",
          phoneVerified: true,
          onboardingComplete: false,
        });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
