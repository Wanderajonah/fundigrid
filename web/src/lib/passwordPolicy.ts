// Mirrors backend/src/services/passwordPolicy.js — the server decides, this is
// only for instant feedback while typing.
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';

export const PASSWORD_RULES: { key: string; label: string; test: (pw: string) => boolean }[] = [
  { key: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: pw => pw.length >= MIN_PASSWORD_LENGTH },
  { key: 'upper', label: 'An uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'A lowercase letter', test: pw => /[a-z]/.test(pw) },
  { key: 'digit', label: 'A number', test: pw => /\d/.test(pw) },
  { key: 'symbol', label: 'A symbol (!@#…)', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

export function evaluatePassword(password: string) {
  return PASSWORD_RULES.map(rule => ({ ...rule, ok: rule.test(password || '') }));
}

export function validatePassword(password: string) {
  return evaluatePassword(password).every(rule => rule.ok);
}
