import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_WELCOME_KEY = 'has_seen_welcome';
const LOCATION_STATE_KEY = 'location_state';

export type LocationState = 'available' | 'unavailable';

export async function hasSeenWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_SEEN_WELCOME_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_SEEN_WELCOME_KEY, 'true');
  } catch {
    // storage unavailable — welcome simply shows again next launch
  }
}

/** Clears the onboarding flag so the welcome screens play again. */
export async function resetWelcome(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HAS_SEEN_WELCOME_KEY);
  } catch {
    // storage unavailable — replay simply won't take
  }
}

/**
 * Last location state we observed at launch. null = never checked.
 * The launch router compares it against the current state: a working-to-broken
 * flip re-opens the Enable Location screen, a broken state that never changed
 * does not nag again.
 */
export async function getLocationState(): Promise<LocationState | null> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_STATE_KEY);
    return value === 'available' || value === 'unavailable' ? value : null;
  } catch {
    return null;
  }
}

export async function setLocationState(state: LocationState): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_STATE_KEY, state);
  } catch {
    // storage unavailable — worst case the screen re-appears once
  }
}
