// Human-facing job reference shown in the admin tables: "JB_" plus the last
// six characters of the database id. Routing and API calls keep using the full
// id — this is display only.
export function jobRef(id?: string | null): string {
  const value = String(id ?? '').trim();
  if (!value) return '—';
  return `JB_${value.slice(-6)}`;
}
