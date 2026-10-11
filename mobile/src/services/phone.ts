// One place that turns whatever the user typed into the canonical Ugandan
// form the backend expects (2567…), matching normalisePhone on the server.
export function toFullPhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

/** 256712345678 → 0712 345678 (what the OTP screens display). */
export function formatUgPhone(full?: string): string {
  const digits = String(full || '').replace(/\D/g, '');
  if (digits.length < 10) return full || '';
  return `0${digits.slice(3, 6)} ${digits.slice(6)}`;
}
