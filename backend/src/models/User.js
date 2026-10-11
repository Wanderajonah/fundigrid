const { Model } = require("../db/shim");

class User extends Model {
  static _table = "users";
  static _defaults = {
    firstName: "",
    lastName: "",
    gender: "",
    email: null,
    phone: null,
    password: "",
    role: "customer",
    fundiEnabled: false,
    phoneVerified: false,
    profilePhoto: "",
    coverPhoto: "",
    googleId: null,
    onboardingComplete: false,
    isOnline: false,
    socketId: null,
    location: { lat: 0, lng: 0 },
    locationLabel: "",
    address: "",
    district: "",
    country: "",
    searchRadiusKm: 10,
    status: "active",
    skills: [],
    experience: 0,
    bio: "",
    portfolioImages: [],
    availableDays: [],
    availableStartTime: "",
    availableEndTime: "",
    serviceRadius: 10,
    verificationDocs: [],
    referees: [],
    // Password sign-in lockout state — see authController.login.
    failedLoginAttempts: 0,
    lockedUntil: null,
    lockoutBatches: 0,
    passwordBlocked: false,
  };
}

module.exports = User;
