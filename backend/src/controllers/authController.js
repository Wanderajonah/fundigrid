const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FundiProfile = require("../models/FundiProfile");
const { sendOtp, verifyOtp } = require("../services/otpService");

const signToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Never hand the password hash back to the client.
function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

// Fundis carry a second row (fundiprofiles) with the rating/verification data
// the profile screens show. Login has to return it or the app renders blanks.
async function profileExtras(user) {
  if (!user || user.role !== "fundi") return {};
  const profile = await FundiProfile.findOne({ userId: user.id });
  if (!profile) return {};
  return {
    rating: Number(profile.rating ?? 0),
    reviewCount: Number(profile.jobsCompleted ?? 0),
    verified: Boolean(profile.verified),
    verificationStatus: profile.verificationStatus || "unverified",
    isAvailable: profile.isAvailable !== false,
    bio: profile.bio || user.bio || "",
  };
}

async function sessionPayload(user) {
  const token = signToken(user);
  return { success: true, token, user: { ...publicUser(user), ...(await profileExtras(user)) } };
}

// A phone number owns exactly one account. Registration writes the person's
// details against that number so a later login returns them instead of a
// generic shell account.
async function ensureAccount({ phone, name, email, password, role }) {
  const requestedRole = role === "fundi" ? "fundi" : "customer";
  let user = await User.findOne({ phone });

  if (user) {
    const patch = {};
    const blankName = !String(user.name || "").trim();
    // Only fill gaps — an in-progress profile is never overwritten by the
    // empty values a fresh signup form submits.
    if (name && blankName) patch.name = String(name).trim();
    if (email && !user.email) patch.email = email;
    if (!user.onboardingComplete && requestedRole !== user.role) patch.role = requestedRole;

    if (Object.keys(patch).length) {
      user = (await User.findByIdAndUpdate(user.id, patch)) || user;
    }
  } else {
    user = await User.create({
      name: String(name || "").trim(),
      phone,
      email: email || null,
      password: password ? await bcrypt.hash(password, 10) : "",
      role: requestedRole,
      phoneVerified: true,
    });
  }

  if (user.role === "fundi") {
    const profile = await FundiProfile.findOne({ userId: user.id });
    if (!profile) await FundiProfile.create({ userId: user.id });
  }

  return user;
}

const sendOtpController = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });
    const purpose = req.body.purpose || "register";
    if (purpose === "login") {
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
    }
    const result = await sendOtp(phone, purpose);
    if (result && result.success === false) {
      return res.status(502).json({ success: false, message: result.message || "Could not send the verification SMS." });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const verifyRegister = async (req, res, next) => {
  try {
    const { phone, code, name, email, password, role } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and code are required" });
    }

    const otpResult = await verifyOtp(phone, code, "register");
    if (!otpResult.success) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    const user = await ensureAccount({ phone, name, email, password, role });
    res.json(await sessionPayload(user));
  } catch (err) {
    next(err);
  }
};

const verifyLogin = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and code are required" });
    }

    const otpResult = await verifyOtp(phone, code, "login");
    if (!otpResult.success) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json(await sessionPayload(user));
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp: sendOtpController, verifyRegister, verifyLogin, profileExtras, publicUser };
