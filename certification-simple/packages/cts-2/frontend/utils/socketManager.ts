import io, { Socket } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../utils/env";

let socket: Socket | null = null;

export const initializeSocket = (url: string): Socket => {
  if (!socket) {
    socket = io(url, {
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => {
  if (!socket) {
    initializeSocket(SOCKET_SERVER_URL);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
