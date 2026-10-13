import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

/**
 * Singleton Socket.IO instance.
 * Initialized once in server.ts via initSocketIO().
 * Imported by controllers directly — no circular dependency.
 */
let _io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: http.Server): SocketIOServer => {
  _io = new SocketIOServer(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });
  return _io;
};

export const getIO = (): SocketIOServer => {
  if (!_io) {
    throw new Error('[Socket.IO] Not initialized. Call initSocketIO() first in server.ts.');
  }
  return _io;
};
