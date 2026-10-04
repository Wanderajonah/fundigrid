const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Otp = require("../models/Otp");
const { sendSms, isConfigured } = require("./egoSms");

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// One place that decides how OTPs leave the server. Render always sets
// RENDER=true and NODE_ENV=production, so production is detected there.
function otpChannel() {
  const configured = isConfigured();
  const production =
    process.env.RENDER === "true" || process.env.NODE_ENV === "production";
  const devMode =
    process.env.COMMS_DEV_MODE === "true" && !(production && configured);
  return { configured, production, devMode };
}

const generateOtp = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

const sendOtp = async (phone, purpose = "register") => {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const existing = await Otp.findOne({ phone, purpose });
  if (existing) {
    await Otp.findOneAndUpdate(
      { phone, purpose },
      { codeHash, expiresAt, attempts: 0, lastSentAt: new Date().toISOString() }
    );
  } else {
    await Otp.create({ phone, purpose, codeHash, expiresAt, attempts: 0, lastSentAt: new Date().toISOString() });
  }

  // Dev mode prints the OTP to this terminal instead of sending an SMS.
  // On Render (RENDER=true / NODE_ENV=production) configured SMS credentials
  // always win, so a stray COMMS_DEV_MODE=true can never put live OTP codes
  // into logs or API responses. Dev mode only survives in production when the
  // provider is not configured yet — health reports that state.
  const channel = otpChannel();
  const devMode = channel.devMode;

  if (devMode) {
    if (channel.production) {
      console.warn(
        `[otp] RUNNING IN DEV OTP FALLBACK IN PRODUCTION — set COMMS_ENDPOINT, COMMS_USERNAME and COMMS_API_KEY so codes go out by SMS.`
      );
    }
    console.log("\n─────────────────────────────────────────────");
    console.log(`  [DEV OTP] ${phone} (${purpose})`);
    console.log(`  Code: ${code}   (valid ${OTP_EXPIRY_MINUTES} min)`);
    console.log("─────────────────────────────────────────────\n");
    return { success: true, code, devMode: true };
  }

  const message = `Your FundiGrid verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;

  if (isConfigured()) {
    const sent = await sendSms(phone, message);
    if (sent.success) return { success: true, sent: true };
    console.error(`[otp] SMS to ${phone} failed: ${sent.message}`);
    return { success: false, message: "Could not send the verification SMS. Please try again." };
  }

  return { success: false, message: "SMS provider is not configured." };
};

const verifyOtp = async (phone, code, purpose = "register") => {
  const record = await Otp.findOne({ phone, purpose });
  if (!record) return { success: false, message: "No OTP found. Request a new one." };

  if (new Date(record.expiresAt) < new Date()) {
    return { success: false, message: "OTP expired. Request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: "Too many attempts. Request a new OTP." };
  }

  const match = await bcrypt.compare(String(code), record.codeHash);
  if (!match) {
    await Otp.findOneAndUpdate({ phone, purpose }, { attempts: (record.attempts || 0) + 1 });
    return { success: false, message: "Invalid code." };
  }

  await Otp.deleteOne({ phone, purpose });
  return { success: true };
};

module.exports = { sendOtp, verifyOtp, generateOtp, otpChannel };
