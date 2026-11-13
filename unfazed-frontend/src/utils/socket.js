
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"]
});

export function connectSocket(token) {
  if (!token) {
    disconnectSocket();
    return false;
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return true;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = {};
}

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection failed:", error.message);
});
