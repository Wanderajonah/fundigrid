const { Model } = require("../db/shim");

class Review extends Model {
  static _table = "reviews";
  static _refs = { fundiId: "users", customerId: "users", jobId: "jobs" };
  static _defaults = {
    fundiId: "",
    customerId: "",
    jobId: null,
    rating: 5,
    comment: "",
    photoUrls: [],
    service: "",
    amount: 0,
  };
}

module.exports = Review;
