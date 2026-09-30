import { Platform } from 'react-native';

export type MapProvider = 'maplibre' | 'google' | 'apple';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  kind?: 'default' | 'price' | 'fundi' | 'user' | 'client';
  color?: string;
  active?: boolean;
  onPress?: () => void;
};

/** Search-radius overlay drawn around the client. */
export type MapRadius = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
};

const rawProvider = (process.env.EXPO_PUBLIC_MAP_PROVIDER || '').toLowerCase();

const isProvider = (value: string): value is MapProvider =>
  value === 'maplibre' || value === 'google' || value === 'apple';

/**
 * Provider resolution:
 * - an explicit `EXPO_PUBLIC_MAP_PROVIDER` (eas.json / .env.local) always wins
 * - development: react-native-maps — its native code ships with Expo Go and dev
 *   clients, MapLibre's does not
 * - production: MapLibre — no Google Maps key or billing account required
 */
export const MAP_PROVIDER: MapProvider = isProvider(rawProvider)
  ? rawProvider
  : __DEV__
    ? 'google'
    : 'maplibre';

export const USE_MAPLIBRE = MAP_PROVIDER === 'maplibre' && Platform.OS !== 'web';

/** OpenFreeMap vector style (no API key) — good default for development. */
export const MAPLIBRE_STYLE_URL =
  process.env.EXPO_PUBLIC_MAPLIBRE_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

/** Kampala fallback when device location is unavailable. */
export const DEFAULT_REGION: MapRegion = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export function regionFromPoints(
  points: { latitude: number; longitude: number }[],
  pad = 1.4
): MapRegion {
  const valid = points.filter(
    (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && (p.latitude !== 0 || p.longitude !== 0)
  );
  if (valid.length === 0) return DEFAULT_REGION;
  if (valid.length === 1) {
    return {
      latitude: valid[0].latitude,
      longitude: valid[0].longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }
  const lats = valid.map((p) => p.latitude);
  const lngs = valid.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.max((maxLat - minLat) * pad, 0.03),
    longitudeDelta: Math.max((maxLng - minLng) * pad, 0.03),
  };
}

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function hasCoords(loc?: { lat?: number; lng?: number } | null): boolean {
  if (!loc) return false;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}
