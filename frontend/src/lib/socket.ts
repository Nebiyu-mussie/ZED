import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      socket.emit('register', { userId: user.id, role: user.role });
    }
  }
  return socket;
};

