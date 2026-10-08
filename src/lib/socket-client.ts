'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
const joinedRooms = new Set<string>();

export function joinRoom(room: string) {
  joinedRooms.add(room);
  getSocket().emit(`join:${room}`);
}

export function getSocket(): Socket {
  if (!socketInstance) {
    const url = typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

    socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      for (const room of joinedRooms) {
        socketInstance?.emit(`join:${room}`);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message);
    });
  }
  return socketInstance;
}
