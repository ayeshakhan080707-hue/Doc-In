import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (userId: string): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('join_user_room', userId);
  }
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
