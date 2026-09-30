const { Model } = require("../db/shim");

class Conversation extends Model {
  static _table = "conversations";
  static _refs = { lastSenderId: "users" };
  static _defaults = {
    participants: [],
    bookingId: null,
    type: "booking",
    lastMessage: "",
    lastSenderId: null,
    lastMessageAt: null,
  };
}

module.exports = Conversation;
