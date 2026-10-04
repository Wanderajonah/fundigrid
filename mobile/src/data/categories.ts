import { IMAGES } from '../assets';

/**
 * Canonical service categories.
 *
 * This is the single source of truth for the app: it drives the fundi onboarding
 * grid, the client "Quick Services" tiles, the request form and the image used
 * when a booking is shown. Values are stored as `label` in `users.skills` and in
 * `bookings.category`; the backend matches them case-insensitively.
 */
export type Category = {
  key: string;
  label: string;
  image?: number;
};

export const CATEGORIES: Category[] = [
  { key: 'plumbing', label: 'Plumbing', image: IMAGES.plumbing },
  { key: 'electrical', label: 'Electrical', image: IMAGES.electrical },
  { key: 'carpentry', label: 'Carpentry', image: IMAGES.carpentry },
  { key: 'masonry', label: 'Masonry', image: IMAGES.masonry },
  { key: 'mechanics', label: 'Mechanics', image: IMAGES.mechanics },
  { key: 'other', label: 'Other', image: undefined },
];

export const CATEGORY_LABELS: string[] = CATEGORIES.map((c) => c.label);

/**
 * Categories a client can pick on a request. "Other" is the catch-all for a
 * custom job: it is offered in the request form and as the home "Others" tile,
 * but fundis do not need it as a skill to be shown for it.
 */
export const REQUESTABLE_CATEGORIES: Category[] = CATEGORIES;

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));
const BY_LABEL = new Map(CATEGORIES.map((c) => [c.label.toLowerCase(), c]));

function find(value?: string | null): Category | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return BY_LABEL.get(v) ?? BY_KEY.get(v);
}

/** Human label for anything stored in the db ("plumbing" -> "Plumbing"). */
export function categoryLabel(value?: string | null): string {
  const found = find(value);
  if (found) return found.label;
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Icon for a category, or undefined when we have no artwork for it. */
export function categoryImage(value?: string | null): number | undefined {
  return find(value)?.image;
}

/** Form value -> the label stored in the db. */
export function toCategoryLabel(key?: string | null): string | undefined {
  return BY_KEY.get(String(key || '').trim())?.label;
}

/**
 * True when a value is one of the canonical labels ("painting" -> true).
 * Anything else is a client-typed trade, which no fundi lists as a skill.
 */
export function isKnownCategory(value?: string | null): boolean {
  const v = String(value || '').trim().toLowerCase();
  return !!v && BY_LABEL.has(v);
}
