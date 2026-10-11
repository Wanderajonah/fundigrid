import { io, Socket } from 'socket.io-client';
import { apiBase } from './config';

let socket: Socket | null = null;

function apiUrl(): string {
  return apiBase().replace(/\/api\/?$/, '');
}

export function connectSocket(token: string): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(apiUrl(), {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });
  socket.on('connect', () => {
    socket?.emit('user_connect', {});
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function emitLocation(payload: { lat: number; lng: number; bookingId?: string }) {
  socket?.emit('update_location', payload);
}
