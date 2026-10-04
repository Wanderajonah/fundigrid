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
  };
}

module.exports = User;
