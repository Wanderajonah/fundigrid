const { Model } = require("../db/shim");

class Otp extends Model {
  static _table = "otps";
  static _defaults = {
    phone: "",
    purpose: "register",
    codeHash: "",
    expiresAt: "",
    attempts: 0,
    lastSentAt: new Date().toISOString(),
  };
}

module.exports = Otp;
