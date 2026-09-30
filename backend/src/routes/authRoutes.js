const express = require("express");
const router = express.Router();
const { sendOtp, verifyRegister, verifyLogin } = require("../controllers/authController");

router.post("/otp/send", sendOtp);
router.post("/otp/verify-register", verifyRegister);
router.post("/otp/verify-login", verifyLogin);

module.exports = router;
