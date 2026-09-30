const { Model } = require("../db/shim");

class FundiProfile extends Model {
  static _table = "fundiprofiles";
  static _defaults = {
    userId: "",
    skills: [],
    experience: 0,
    rating: 0,
    jobsCompleted: 0,
    verified: false,
    verificationStatus: "unverified",
    verificationDocs: [],
    verificationNotes: "",
    requestedAt: null,
    reviewedAt: null,
    portfolioImages: [],
    currentLocation: {},
    isAvailable: true,
    availableForNegotiation: false,
    bio: "",
  };
}

module.exports = FundiProfile;
