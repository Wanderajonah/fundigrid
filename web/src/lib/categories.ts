// Canonical trade labels shared by every category picker on the web app.
// The backend stores these as skill labels (e.g. "Plumbing") and matches them
// case-insensitively when clients filter fundis.

export interface Category {
  label: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { label: 'Plumbing', icon: '🔧' },
  { label: 'Electrical', icon: '⚡' },
  { label: 'Carpentry', icon: '🪚' },
  { label: 'Masonry', icon: '🧱' },
  { label: 'Tailoring', icon: '✂️' },
  { label: 'Mechanics', icon: '🔩' },
  { label: 'Painting', icon: '🎨' },
  { label: 'Landscaping', icon: '🌿' },
];

export const CATEGORY_LABELS: string[] = CATEGORIES.map(c => c.label);

export function categoryIcon(label?: string | null) {
  return CATEGORIES.find(c => c.label.toLowerCase() === label?.trim().toLowerCase())?.icon ?? '🛠️';
}
