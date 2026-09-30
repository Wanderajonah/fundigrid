const { Model } = require("../db/shim");

class EmailOtp extends Model {
  static _table = "email_otps";
  static _defaults = {
    email: "",
    purpose: "login",
    codeHash: "",
    expiresAt: "",
    attempts: 0,
    lastSentAt: new Date().toISOString(),
  };
}

module.exports = EmailOtp;
