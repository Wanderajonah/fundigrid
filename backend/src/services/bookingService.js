const sendToNextFundi = async (booking) => {
  // Stub: in production, notifies the next fundi in the list
};

const negotiatePrice = async (bookingId, userId, role, payload) => {
  const Booking = require("../models/Booking");
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (payload.action === "propose") {
    booking.proposedPrice = payload.price;
    booking.proposedBy = role === "fundi" ? "FUNDI" : "CLIENT";
  } else if (payload.action === "accept") {
    if (role === "fundi") booking.fundiPriceAgreed = true;
    else booking.clientPriceAgreed = true;
    if (booking.fundiPriceAgreed && booking.clientPriceAgreed) {
      booking.priceAgreed = true;
      booking.agreedPrice = booking.proposedPrice;
    }
  } else if (payload.action === "reject") {
    booking.proposedPrice = null;
    booking.proposedBy = null;
    booking.clientPriceAgreed = false;
    booking.fundiPriceAgreed = false;
  }

  const { save } = booking;
  await save();
  return booking;
};

module.exports = { sendToNextFundi, negotiatePrice };
