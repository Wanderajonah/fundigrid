// Canonical trade labels shared by every category picker on the web app.
// The backend stores these as skill labels (e.g. "Plumbing") and matches them
// case-insensitively when clients filter fundis.

import { BrickWall, Cog, Hammer, Paintbrush, Trees, Wrench, Zap, type LucideIcon } from 'lucide-react';

export interface Category {
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { label: 'Plumbing', icon: Wrench },
  { label: 'Electrical', icon: Zap },
  { label: 'Carpentry', icon: Hammer },
  { label: 'Masonry', icon: BrickWall },
  { label: 'Mechanics', icon: Cog },
  { label: 'Painting', icon: Paintbrush },
  { label: 'Landscaping', icon: Trees },
];

export const CATEGORY_LABELS: string[] = CATEGORIES.map(c => c.label);

export function categoryIcon(label?: string | null): LucideIcon {
  return CATEGORIES.find(c => c.label.toLowerCase() === label?.trim().toLowerCase())?.icon ?? Wrench;
}
