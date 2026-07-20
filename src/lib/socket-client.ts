'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

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
      console.log('[socket] connected');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message);
    });
  }
  return socketInstance;
}
