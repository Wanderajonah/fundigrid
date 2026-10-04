const { Model } = require("../db/shim");

class Booking extends Model {
  static _table = "bookings";
  static _refs = { clientId: "users", fundiId: "users" };
  static _defaults = {
    clientId: "",
    fundiId: null,
    category: "",
    description: "",
    address: "",
    location: { lat: 0, lng: 0 },
    status: "PENDING",
    cancelledBy: null,
    cancellationReason: null,
    disputeReason: null,
    notifiedFundis: [],
    currentFundiIndex: 0,
    expiresAt: null,
    acceptedAt: null,
    onTheWayAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    clientCompleted: false,
    fundiCompleted: false,
    clientCompletedAt: null,
    fundiCompletedAt: null,
    cancelledAt: null,
    fundiLocation: {},
    images: [],
    estimatedDuration: 60,
    actualDuration: null,
    proposedPrice: null,
    proposedBy: null,
    clientPriceAgreed: false,
    fundiPriceAgreed: false,
    agreedPrice: null,
    priceAgreed: false,
    paymentStatus: "unpaid",
    escrowHeldAt: null,
    escrowReleasedAt: null,
    escrowAmount: null,
    clientFee: 0,
    // Quantity-surveyor stage. NULL = written before the stage existed, which
    // surveyService reads as "estimate already ready".
    surveyorId: null,
    surveyorName: "",
    surveyStatus: null,
    assignedAt: null,
    estimateSubmittedAt: null,
    estimateBy: null,
  };
}

module.exports = Booking;
