import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { apiBase } from './config';

// SignalR replaced Socket.IO on the backend. Event names are unchanged
// (`fundi_location`, `update_location`, `user_connect`), so consumers keep
// using the same handler names.
let socket: HubConnection | null = null;

function hubUrl(): string {
  return `${apiBase().replace(/\/api\/?$/, '')}/hubs/realtime`;
}

export function connectSocket(token: string): HubConnection {
  if (socket) {
    if (socket.state === HubConnectionState.Disconnected) {
      void socket.start().then(() => socket?.invoke('user_connect')).catch(() => {});
    }
    return socket;
  }

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl(), { accessTokenFactory: () => token })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.onreconnected(() => {
    void connection.invoke('user_connect').catch(() => {});
  });

  socket = connection;
  void connection
    .start()
    .then(() => connection.invoke('user_connect'))
    .catch(() => {});

  return connection;
}

export function getSocket(): HubConnection | null {
  return socket;
}

export function disconnectSocket() {
  const current = socket;
  socket = null;
  void current?.stop().catch(() => {});
}

export function emitLocation(payload: { lat: number; lng: number; bookingId?: string }) {
  if (socket?.state !== HubConnectionState.Connected) return;
  void socket
    .invoke('update_location', payload.lat, payload.lng, payload.bookingId ?? null)
    .catch(() => {});
}
