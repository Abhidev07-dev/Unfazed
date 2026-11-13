import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

let activeToken = null;

export function connectSocket(token) {
  if (!token) {
    disconnectSocket();
    return false;
  }

  // Reuse the current connection if it already has the correct token.
  if (activeToken === token && socket.connected) {
    return true;
  }

  // Disconnect if switching between therapist and client accounts.
  if (activeToken !== token) {
    if (socket.connected || socket.active) {
      socket.disconnect();
    }

    activeToken = token;
    socket.auth = { token };
    socket.connect();

    return true;
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return true;
}

export function disconnectSocket() {
  if (socket.connected || socket.active) {
    socket.disconnect();
  }

  activeToken = null;
  socket.auth = {};
}

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection failed:", error.message);
});