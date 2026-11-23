import { io } from 'socket.io-client';
import { getAccessToken } from './api';
let socket = null;
export const connectSocket = () => {
  if (socket) return socket;
  const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';

socket = io(socketUrl, {
  auth: (cb) => cb({ token: getAccessToken() }),
  reconnectionAttempts: 10
});
  return socket;
};
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
export const getSocket = () => socket;
