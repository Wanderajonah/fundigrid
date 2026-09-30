const { Model } = require("../db/shim");

class Job extends Model {
  static _table = "jobs";
  static _refs = { customerId: "users", fundiId: "users" };
  static _defaults = {
    customerId: "",
    fundiId: null,
    description: "",
    category: "",
    location: { lat: 0, lng: 0 },
    imageUrl: "",
    quoteAmount: 0,
    status: "open",
    address: "",
    amount: 0,
  };
}

module.exports = Job;
