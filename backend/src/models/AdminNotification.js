const { Model } = require("../db/shim");

class AdminNotification extends Model {
  static _table = "admin_notifications";
  static _defaults = {
    type: "info",
    message: "",
    relatedId: null,
    read: false,
  };
}

module.exports = AdminNotification;
