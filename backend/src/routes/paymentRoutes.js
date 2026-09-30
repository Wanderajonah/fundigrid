const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { estimateFor } = require("../services/estimateService");

const METHODS = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  cash: "Cash",
};

function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FG-${stamp}-${rand}`;
}

// The price the client actually owes: what the fundi and client agreed, then
// the fundi's proposal, then the job's estimate.
function agreedAmount(booking) {
  const value = Number(booking.agreedPrice ?? booking.proposedPrice ?? 0);
  if (Number.isFinite(value) && value > 0) return value;
  const estimated = Number(estimateFor(booking).total || 0);
  return Number.isFinite(estimated) && estimated > 0 ? estimated : 0;
}

function receiptFrom(txn, booking) {
  return {
    reference: txn.reference,
    method: txn.paymentMethod || "Payment",
    amount: Number(txn.amount),
    currency: txn.currency || "UGX",
    status: "paid",
    paidAt: txn.created_at,
    bookingId: String(booking.id),
    fundiName: booking.fundiName || "",
    category: booking.category || "",
    phone: (txn.metadata && txn.metadata.phone) || "",
    simulated: Boolean(txn.metadata && txn.metadata.simulated),
  };
}

async function findPayment(bookingId, clientId) {
  return Transaction.findOne({ relatedBooking: bookingId, userId: clientId, type: "payment" });
}

// POST /api/payments/pay — client pays for their own completed booking.
// The charge itself is simulated today; swap the block marked SIMULATION for a
// mobile-money gateway call when credentials are available.
router.post("/pay", protect, async (req, res, next) => {
  try {
    const { bookingId, method, phone, amount } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }
    const methodKey = String(method || "mtn").toLowerCase();
    if (!METHODS[methodKey]) {
      return res.status(400).json({ success: false, message: "Choose MTN, Airtel or Cash." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    // Paying twice must never charge twice — return the receipt instead.
    const existing = await findPayment(String(booking.id), req.user.id);
    if (existing) {
      return res.json({ success: true, alreadyPaid: true, receipt: receiptFrom(existing, booking) });
    }

    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: "You can pay once the job is completed." });
    }

    let payable = agreedAmount(booking);
    if (!payable) payable = Number(amount || 0);
    if (!Number.isFinite(payable) || payable <= 0) {
      return res.status(400).json({ success: false, message: "Enter the amount to pay." });
    }

    const now = new Date().toISOString();
    const reference = makeReference();
    const label = METHODS[methodKey];

    const clientWallet =
      (await Wallet.findOne({ userId: req.user.id })) ||
      (await Wallet.create({ userId: req.user.id }));
    const fundiWallet = booking.fundiId
      ? (await Wallet.findOne({ userId: booking.fundiId })) ||
        (await Wallet.create({ userId: booking.fundiId }))
      : null;

    // SIMULATION: a gateway would confirm this charge before we record it.
    const paymentTxn = await Transaction.create({
      walletId: clientWallet.id,
      userId: req.user.id,
      type: "payment",
      amount: payable,
      reference,
      description: `Payment for ${booking.category}`,
      relatedBooking: booking.id,
      relatedUser: booking.fundiId || null,
      balanceBefore: Number(clientWallet.balance || 0),
      balanceAfter: Number(clientWallet.balance || 0),
      paymentMethod: label,
      metadata: { phone: phone || "", simulated: true },
    });

    if (fundiWallet) {
      const before = Number(fundiWallet.balance || 0);
      const after = before + payable;
      await Wallet.findByIdAndUpdate(fundiWallet.id, { balance: after });
      await Transaction.create({
        walletId: fundiWallet.id,
        userId: booking.fundiId,
        type: "payment_received",
        amount: payable,
        // references are unique across the table — credit gets its own suffix
        reference: `${reference}-R`,
        description: `Payment from client for ${booking.category}`,
        relatedBooking: booking.id,
        relatedUser: req.user.id,
        balanceBefore: before,
        balanceAfter: after,
        paymentMethod: label,
        metadata: { simulated: true },
      });
    }

    await Booking.findByIdAndUpdate(booking.id, {
      paymentStatus: "released",
      escrowHeldAt: now,
      escrowReleasedAt: now,
      escrowAmount: payable,
    });

    res.json({ success: true, receipt: receiptFrom(paymentTxn, booking) });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/:bookingId — the receipt for a booking the client paid.
router.get("/:bookingId", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }
    const txn = await findPayment(String(booking.id), req.user.id);
    if (!txn) {
      return res.status(404).json({ success: false, message: "No payment for this job yet." });
    }
    res.json({ success: true, receipt: receiptFrom(txn, booking) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
