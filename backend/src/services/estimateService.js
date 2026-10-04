// Job cost estimate — the number shown on the confirm screen and the amount
// payment falls back to when no price was agreed in chat.
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

// The estimate a quantity surveyor costed by hand. Same shape as the rate-card
// one so every screen that already renders an estimate keeps working, plus the
// `source` and the surveyor's own notes.
function buildSurveyEstimate({ category, labour, materials, serviceFee, notes } = {}) {
  const label = String(category || "").trim();
  const lab = Number(labour) || 0;
  const mat = Number(materials) || 0;
  const fee =
    serviceFee !== undefined && serviceFee !== null && serviceFee !== ""
      ? Math.max(0, Number(serviceFee) || 0)
      : Math.max(MIN_SERVICE_FEE, Math.round((lab + mat) * SERVICE_FEE_RATE));
  return {
    category: label,
    labour: lab,
    materials: mat,
    serviceFee: fee,
    total: lab + mat + fee,
    currency: "UGX",
    source: "surveyor",
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString(),
  };
}

// A booking written before estimates existed still needs an amount — rebuild
// one from its category so payment never ends up with 0.
function estimateFor(booking) {
  const stored = booking && booking.estimate;
  if (stored && Number(stored.total) > 0) return stored;
  return buildEstimate(booking ? booking.category : "");
}

module.exports = { buildEstimate, buildSurveyEstimate, estimateFor };
