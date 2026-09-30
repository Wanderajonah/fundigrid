const { Model } = require("../db/shim");

class Wallet extends Model {
  static _table = "wallets";
  static _refs = { userId: "users" };
  static _defaults = {
    userId: "",
    balance: 0,
    heldBalance: 0,
    currency: "UGX",
    status: "active",
  };
}

module.exports = Wallet;
