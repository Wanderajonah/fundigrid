const { Model } = require("../db/shim");

class AuditLog extends Model {
  static _table = "audit_logs";
  static _defaults = {
    actorId: null,
    actorName: "",
    actorRole: "",
    action: "",
    category: "users",
    entityType: "",
    entityId: "",
    summary: "",
    ipAddress: "",
    userAgent: "",
    meta: {},
  };
}

module.exports = AuditLog;
