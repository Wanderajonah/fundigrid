// One rule set for every password the product accepts: 8+ characters with at
// least one uppercase letter, one lowercase letter, one digit and one symbol.
// Mobile, web and the admin console all mirror these checks for fast feedback,
// but this is the only place that decides.

const MIN_LENGTH = 8;

const RULES = [
  { key: "length", label: `At least ${MIN_LENGTH} characters`, test: (pw) => pw.length >= MIN_LENGTH },
  { key: "upper", label: "An uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "A lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "digit", label: "A number", test: (pw) => /\d/.test(pw) },
  { key: "symbol", label: "A symbol (!@#…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.";

function evaluate(password) {
  const pw = String(password || "");
  return RULES.map((rule) => ({ key: rule.key, label: rule.label, ok: rule.test(pw) }));
}

function validatePassword(password) {
  const failed = evaluate(password).filter((rule) => !rule.ok);
  return { ok: failed.length === 0, message: MESSAGE, failed: failed.map((rule) => rule.key) };
}

// Used after a successful sign-in to flag accounts created before these rules
// (or by the admin console under the old 6-character floor).
function isWeak(password) {
  if (!password) return false;
  return !validatePassword(password).ok;
}

module.exports = { validatePassword, isWeak, evaluate, MESSAGE, MIN_LENGTH, RULES };
