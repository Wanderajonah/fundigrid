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

// The database keeps first and last name apart; most screens still render a
// single line, so everything user-facing goes through this helper.
function fullName(user) {
  if (!user) return "";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim();
}

// One account per number, whatever shape it was typed in: 0772…, +256 772…
// and 256772… must all resolve to the same row.
function normalisePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

// Never hand the password hash back to the client.
function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return { ...rest, name: fullName(rest) };
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
async function ensureAccount({ phone, firstName, lastName, email, password, role }) {
  phone = normalisePhone(phone);
  const requestedRole = role === "fundi" ? "fundi" : "customer";
  let user = await User.findOne({ phone });

  if (user) {
    const patch = {};
    const blankName = !fullName(user);
    // Only fill gaps — an in-progress profile is never overwritten by the
    // empty values a fresh signup form submits.
    if (firstName && blankName) {
      patch.firstName = String(firstName).trim();
      patch.lastName = String(lastName || "").trim();
    }
    if (email && !user.email) patch.email = email;
    if (!user.onboardingComplete && requestedRole !== user.role) patch.role = requestedRole;

    if (Object.keys(patch).length) {
      user = (await User.findByIdAndUpdate(user.id, patch)) || user;
    }
  } else {
    user = await User.create({
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
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
    const phone = normalisePhone(req.body.phone);
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
    const phone = normalisePhone(req.body.phone);
    const { code, firstName, lastName, email, password, role } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and code are required" });
    }

    const otpResult = await verifyOtp(phone, code, "register");
    if (!otpResult.success) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    const user = await ensureAccount({ phone, firstName, lastName, email, password, role });
    res.json(await sessionPayload(user));
  } catch (err) {
    next(err);
  }
};

const verifyLogin = async (req, res, next) => {
  try {
    const phone = normalisePhone(req.body.phone);
    const { code } = req.body;
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

module.exports = { sendOtp: sendOtpController, verifyRegister, verifyLogin, profileExtras, publicUser, fullName, normalisePhone };
