const { Model } = require("../db/shim");

class Message extends Model {
  static _table = "messages";
  static _refs = { senderId: "users", conversationId: "conversations" };
  static _defaults = {
    conversationId: "",
    senderId: "",
    text: "",
    imageUrl: null,
    read: false,
  };
}

module.exports = Message;
