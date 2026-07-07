'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = getSocket();
    }
    const socket = socketRef.current;

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
