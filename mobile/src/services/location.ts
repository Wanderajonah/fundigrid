import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REGION, MapRegion } from '../maps/config';

const CACHED_KEY = 'device_location';

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getCachedLocation(): Promise<DeviceLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheLocation(loc: DeviceLocation) {
  await AsyncStorage.setItem(CACHED_KEY, JSON.stringify(loc));
}

export async function getCurrentLocation(): Promise<DeviceLocation | null> {
  const granted = await ensureLocationPermission();
  if (!granted) return getCachedLocation();
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const loc: DeviceLocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
    await cacheLocation(loc);
    return loc;
  } catch {
    return getCachedLocation();
  }
}

export async function getMapRegion(): Promise<MapRegion> {
  const loc = await getCurrentLocation();
  if (!loc) return DEFAULT_REGION;
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}

export function regionToLocation(region: MapRegion): DeviceLocation {
  return { latitude: region.latitude, longitude: region.longitude };
}

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

// Native reverse geocoding is the fastest path, but on Android it needs a
// Google Maps API key. Fall back to OpenStreetMap, then to raw coordinates,
// so the caller always gets something readable to show.
async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      const locality = place.district || place.subregion || place.city || place.name;
      const parts = [locality, place.region, place.country].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
  } catch {
    // no Google key configured on Android — try the network fallback below
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${latitude}&lon=${longitude}`,
      { headers: { Accept: 'application/json', 'Accept-Language': 'en' } },
    );
    if (res.ok) {
      const data = await res.json();
      const a = data?.address || {};
      const locality = a.suburb || a.village || a.town || a.city_district || a.city || a.county;
      const parts = [locality, a.state, a.country].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
  } catch {
    // offline or rate-limited — fall through to coordinates
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

// Reads the device GPS fix and turns it into a human-readable place label.
// Returns null when permission was denied so the UI can offer a manual entry.
export async function resolveCurrentLocation(): Promise<ResolvedLocation | null> {
  const granted = await ensureLocationPermission();
  if (!granted) return null;

  const loc = await getCurrentLocation();
  if (!loc) return null;

  const address = await reverseGeocode(loc.latitude, loc.longitude);
  const resolved: ResolvedLocation = {
    latitude: loc.latitude,
    longitude: loc.longitude,
    address,
  };
  await cacheLocation(resolved);
  return resolved;
}
