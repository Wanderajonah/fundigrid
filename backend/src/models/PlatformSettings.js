const { Model } = require("../db/shim");

class PlatformSettings extends Model {
  static _table = "platform_settings";
  static _defaults = {
    adminName: "Admin User",
    adminEmail: "admin@ufundi.com",
    adminRole: "Super Admin",
    commissionRate: 0,
    clientFeeRate: 5,
    minJobAmount: 500,
    serviceRadius: 25,
    autoApprovalFundis: "10 successful jobs",
    disputeResolution: "48 hours",
    notifications: [],
    paymentIntegrations: [],
  };
}

module.exports = PlatformSettings;
