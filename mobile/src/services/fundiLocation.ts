import * as Location from 'expo-location';
import { emitLocation, connectSocket } from './socket';

type Options = {
  token: string;
  bookingId?: string;
  intervalMs?: number;
};

let timer: ReturnType<typeof setInterval> | null = null;

export async function startFundiLocationShare({ token, bookingId, intervalMs = 8000 }: Options) {
  stopFundiLocationShare();
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
  } catch {
    return;
  }

  connectSocket(token);

  const push = async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      emitLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        bookingId,
      });
    } catch {
      // ignore transient location errors
    }
  };

  await push();
  timer = setInterval(push, intervalMs);
}

export function stopFundiLocationShare() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
