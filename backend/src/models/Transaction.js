const { Model } = require("../db/shim");

class Transaction extends Model {
  static _table = "transactions";
  static _refs = { walletId: "wallets", userId: "users", relatedBooking: "bookings", relatedUser: "users" };
  static _defaults = {
    walletId: "",
    userId: "",
    type: "deposit",
    amount: 0,
    currency: "UGX",
    reference: null,
    description: "",
    status: "completed",
    relatedBooking: null,
    relatedUser: null,
    balanceBefore: 0,
    balanceAfter: 0,
    paymentMethod: "",
    metadata: {},
  };
}

module.exports = Transaction;
