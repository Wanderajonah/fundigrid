const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FundiProfile = require("../models/FundiProfile");
const { sendOtp, verifyOtp } = require("../services/otpService");
const { validatePassword, isWeak } = require("../services/passwordPolicy");
const { getSupabase } = require("../config/supabase");

// Phone sign-in lockout: five wrong passwords lock the number for ten
// minutes, three such batches leave it blocked until a password reset.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;
const MAX_BATCHES = 3;

// Compared against when the account is unknown so a missing user and a wrong
// password cost the same amount of time (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-0", 10);

function clearLockout() {
  return { failedLoginAttempts: 0, lockedUntil: null, lockoutBatches: 0, passwordBlocked: false };
}

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
    // The admin's reason when a submission came back rejected.
    verificationNote: profile.verificationNotes || "",
    isAvailable: profile.isAvailable !== false,
    bio: profile.bio || user.bio || "",
  };
}

async function sessionPayload(user) {
  const token = signToken(user);
  // Accounts created before the current rules (or by the admin console under
  // the old floor) still sign in — they are just asked to pick a stronger one.
  return {
    success: true,
    token,
    passwordWeak: isWeak(user.password),
    hasPassword: Boolean(user.password),
    user: { ...publicUser(user), ...(await profileExtras(user)) },
  };
}

// A phone number owns exactly one account. Registration writes the person's
// details against that number so a later login returns them instead of a
// generic shell account. `existed` tells the caller whether the number was
// already registered — a fresh account also comes back with a password (the
// sign-up form sets one), so `hasPassword` alone cannot tell the two apart.
async function ensureAccount({ phone, firstName, lastName, email, password, role }) {
  phone = normalisePhone(phone);
  const requestedRole = role === "fundi" ? "fundi" : "customer";
  let user = await User.findOne({ phone });
  let existed = true;

  if (user) {
    const patch = {};
    const blankName = !fullName(user);
    // Only fill gaps — an in-progress profile is never overwritten by the
    // empty values a fresh signup form submits.
    if (firstName && blankName) {
      patch.firstName = String(firstName).trim();
      patch.lastName = String(lastName || "").trim();
    }
    if (email && !user.email) patch.email = String(email).trim().toLowerCase();
    if (!user.onboardingComplete && requestedRole !== user.role) patch.role = requestedRole;

    if (Object.keys(patch).length) {
      user = (await User.findByIdAndUpdate(user.id, patch)) || user;
    }
  } else {
    user = await User.create({
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      phone,
      email: email ? String(email).trim().toLowerCase() : null,
      password: password ? await bcrypt.hash(password, 10) : "",
      role: requestedRole,
      phoneVerified: true,
    });
    existed = false;
  }

  if (user.role === "fundi") {
    const profile = await FundiProfile.findOne({ userId: user.id });
    if (!profile) await FundiProfile.create({ userId: user.id });
  }

  return { user, existed };
}

// OTP is verification only: `register` proves a number at sign-up, `reset`
// opens the forgot-password flow. Signing in with a password replaced it.
const OTP_PURPOSES = ["register", "reset"];

const sendOtpController = async (req, res, next) => {
  try {
    const phone = normalisePhone(req.body.phone);
    if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });
    const purpose = OTP_PURPOSES.includes(req.body.purpose) ? req.body.purpose : "register";
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

    // Passwords are normally set later (profile setup), but older clients can
    // still send one here — hold it to the same rules.
    if (password) {
      const policy = validatePassword(password);
      if (!policy.ok) return res.status(400).json({ success: false, message: policy.message });
    }

    const { user, existed } = await ensureAccount({ phone, firstName, lastName, email, password, role });
    res.json({ ...(await sessionPayload(user)), accountExisted: existed });
  } catch (err) {
    next(err);
  }
};

// The forgot-password flow deliberately never reveals whether a number has an
// account: the response is always identical, and a reset OTP is only sent when
// there is something to reset.
const forgotPassword = async (req, res, next) => {
  try {
    const phone = normalisePhone(req.body.phone);
    if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });

    const user = await User.findOne({ phone });
    if (user && user.password) {
      const result = await sendOtp(phone, "reset");
      if (result && result.success === false) {
        return res.status(502).json({ success: false, message: result.message || "Could not send the verification SMS." });
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Verify the reset OTP, store the new password and sign the user in. This is
// also the escape hatch from a locked-out (or never-set) password: it clears
// every lockout field on the account.
const resetPassword = async (req, res, next) => {
  try {
    const phone = normalisePhone(req.body.phone);
    const { code, password } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and code are required" });
    }

    // Check the rules before consuming the code so a typo'd password does not
    // force the user to request another SMS.
    const policy = validatePassword(password);
    if (!policy.ok) {
      return res.status(400).json({ success: false, message: policy.message });
    }

    const otpResult = await verifyOtp(phone, code, "reset");
    if (!otpResult.success) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await User.findByIdAndUpdate(user.id, {
      password: await bcrypt.hash(String(password), 10),
      ...clearLockout(),
    });

    const fresh = await User.findById(user.id);
    res.json(await sessionPayload(fresh || user));
  } catch (err) {
    next(err);
  }
};

// Signed-in password change (profile setup, settings, web security page).
const changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { currentPassword, password } = req.body;
    if (!validatePassword(password).ok) {
      return res.status(400).json({ success: false, message: validatePassword(password).message });
    }

    // An account that has no password yet (every mobile sign-up before this
    // change) does not need to know the current one.
    if (user.password) {
      const ok = currentPassword && (await bcrypt.compare(String(currentPassword), user.password));
      if (!ok) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }
    }

    await User.findByIdAndUpdate(user.id, {
      password: await bcrypt.hash(String(password), 10),
      ...clearLockout(),
    });

    const fresh = await User.findById(user.id);
    res.json(await sessionPayload(fresh || user));
  } catch (err) {
    next(err);
  }
};

// Email is the sign-in handle. Stored addresses may predate the lowercase
// convention, so fall back to a case-insensitive match before giving up.
async function findByEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;
  const exact = await User.findOne({ email: clean });
  if (exact) return exact;
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .ilike("email", clean.replace(/([%_\\])/g, "\\$1"))
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

// Password sign-in. The handle is the phone number on mobile and the email
// address on web — the graduated lockout below counts phone attempts only, so
// a locked mobile account still signs in on web when it has an email.
const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = normalisePhone(req.body.phone);
    const password = String(req.body.password || "");
    const viaPhone = !email && Boolean(phone);

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Phone or email is required" });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    const user = viaPhone ? await User.findOne({ phone }) : await findByEmail(email);

    if (viaPhone && user) {
      if (user.passwordBlocked) {
        return res.status(403).json({
          success: false,
          code: "PASSWORD_BLOCKED",
          message: "Password sign-in is blocked after too many attempts. Use Forgot Password to reset it.",
        });
      }
      const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
      if (lockedUntil > Date.now()) {
        const retryAfterSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          code: "LOCKED",
          retryAfterSeconds,
          attemptsRemaining: 0,
          message: `Too many wrong attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s), or reset your password now.`,
        });
      }
    }

    // Always run bcrypt so an unknown account and a wrong password cost the
    // same time.
    const ok =
      Boolean(user) &&
      Boolean(user.password) &&
      (await bcrypt.compare(password, user.password || DUMMY_HASH));

    if (!ok) {
      if (viaPhone && user && !user.password) {
        return res.status(401).json({
          success: false,
          code: "PASSWORD_NOT_SET",
          message: "This account has no password yet. Use Forgot Password to set one.",
        });
      }

      const handle = viaPhone ? "phone" : "email";

      // Count misses against the account (phone sign-in only).
      if (viaPhone && user && user.password) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const patch = { failedLoginAttempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          patch.failedLoginAttempts = 0;
          patch.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
          patch.lockoutBatches = (user.lockoutBatches || 0) + 1;
          if (patch.lockoutBatches >= MAX_BATCHES) patch.passwordBlocked = true;
        }
        await User.findByIdAndUpdate(user.id, patch);

        if (patch.lockedUntil) {
          const blocked = Boolean(patch.passwordBlocked);
          return res.status(429).json({
            success: false,
            code: blocked ? "PASSWORD_BLOCKED" : "LOCKED",
            retryAfterSeconds: LOCKOUT_MINUTES * 60,
            attemptsRemaining: 0,
            message: blocked
              ? `Password sign-in is blocked after ${MAX_BATCHES} rounds of ${MAX_ATTEMPTS} wrong attempts. Use Forgot Password to reset it.`
              : `Too many wrong attempts. Sign-in is disabled for ${LOCKOUT_MINUTES} minutes — or reset your password now.`,
          });
        }

        const attemptsRemaining = MAX_ATTEMPTS - attempts;
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          attemptsRemaining,
          message: `Invalid ${handle} or password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left before a ${LOCKOUT_MINUTES}-minute lock.`,
        });
      }

      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: `Invalid ${handle} or password`,
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({ success: false, message: "This account is inactive. Contact the administrator." });
    }

    // A successful sign-in clears the slate.
    if (
      viaPhone &&
      (user.failedLoginAttempts || user.lockedUntil || user.lockoutBatches || user.passwordBlocked)
    ) {
      await User.findByIdAndUpdate(user.id, clearLockout());
    }

    res.json(await sessionPayload(user));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendOtp: sendOtpController,
  verifyRegister,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  profileExtras,
  publicUser,
  fullName,
  normalisePhone,
};
