const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyRegister,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Sign-in is password based. OTP exists only to verify a number at sign-up
// (`/otp/verify-register`) and to unlock the forgot-password flow.
router.post("/login", login);
router.post("/otp/send", sendOtp);
router.post("/otp/verify-register", verifyRegister);

router.post("/password/forgot", forgotPassword);
router.post("/password/reset", resetPassword);
router.post("/password", protect, changePassword);

module.exports = router;
