// Rate-card job costs.
//
// The client and the fundi agree the real price between themselves — the
// fundi quotes after seeing the site. These rates exist only as the amount
// payment falls back to when nothing was agreed, so they are never shown to
// anyone.
//
// Rates are a per-trade starting point (labour + materials) plus a platform
// service fee. Keep them here until platform settings get an admin editor,
// then read them from there instead.

const RATE_CARD = {
  plumbing: { labour: 120000, materials: 80000 },
  electrical: { labour: 130000, materials: 90000 },
  carpentry: { labour: 110000, materials: 70000 },
  masonry: { labour: 100000, materials: 120000 },
  painting: { labour: 90000, materials: 60000 },
  cleaning: { labour: 60000, materials: 20000 },
  gardening: { labour: 70000, materials: 30000 },
  welding: { labour: 120000, materials: 100000 },
};

const DEFAULT_RATE = { labour: 100000, materials: 60000 };
const SERVICE_FEE_RATE = 0.05;
const MIN_SERVICE_FEE = 10000;

function rateFor(category) {
  const key = String(category || "").trim().toLowerCase();
  if (RATE_CARD[key]) return RATE_CARD[key];
  const hit = Object.keys(RATE_CARD).find((k) => key.includes(k) || k.includes(key));
  return RATE_CARD[hit] || DEFAULT_RATE;
}

function buildEstimate(category) {
  const label = String(category || "").trim();
  const rate = rateFor(label);
  const subtotal = rate.labour + rate.materials;
  const serviceFee = Math.max(MIN_SERVICE_FEE, Math.round(subtotal * SERVICE_FEE_RATE));
  return {
    category: label,
    labour: rate.labour,
    materials: rate.materials,
    serviceFee,
    total: subtotal + serviceFee,
    currency: "UGX",
    source: "rate_card",
    createdAt: new Date().toISOString(),
  };
}

// A booking with no agreed price still needs an amount — rebuild one from its
// category so payment never ends up with 0.
function estimateFor(booking) {
  const stored = booking && booking.estimate;
  if (stored && Number(stored.total) > 0) return stored;
  return buildEstimate(booking ? booking.category : "");
}

module.exports = { buildEstimate, estimateFor };
