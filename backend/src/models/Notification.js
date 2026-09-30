const { Model } = require("../db/shim");

class Notification extends Model {
  static _table = "notifications";
  static _refs = { userId: "users" };
  static _defaults = {
    userId: "",
    type: "system",
    title: "",
    body: "",
    data: {},
    read: false,
  };
}

module.exports = Notification;
