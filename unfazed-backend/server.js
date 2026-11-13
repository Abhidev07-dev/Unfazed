
require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./src/config/db");
const ClientAccount = require("./src/models/ClientAccount");

const PORT = process.env.PORT || 5000;

// Allow local development and the deployed frontend.
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

// Express CORS configuration.
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

const httpServer = http.createServer(app);

// Socket.IO CORS configuration.
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Authenticate both therapist and client connections.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "client") {
      if (!decoded.clientId || !decoded.therapistId) {
        return next(new Error("Invalid client token"));
      }

      const account = await ClientAccount.findOne({
        client: decoded.clientId,
        therapist: decoded.therapistId,
        isActive: true,
      }).select("_id");

      if (!account) {
        return next(new Error("Client account unavailable"));
      }

      socket.data.role = "client";
      socket.data.clientId = decoded.clientId;
      socket.data.therapistId = decoded.therapistId;

      return next();
    }

    // Preserve existing therapist JWT authentication.
    if (!decoded.id) {
      return next(new Error("Invalid therapist token"));
    }

    socket.data.role = "therapist";
    socket.data.therapistId = decoded.id;

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

// Join only the private room authorized by the verified token.
io.on("connection", (socket) => {
  if (socket.data.role === "client") {
    socket.join(`client:${socket.data.clientId}`);
    console.log(`Authenticated client connected: ${socket.id}`);
  } else {
    socket.join(`therapist:${socket.data.therapistId}`);
    console.log(`Authenticated therapist connected: ${socket.id}`);
  }

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from environment variables");
    }

    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Unfazed backend running on port ${PORT}`);
      console.log("Authenticated Socket.IO server is ready 🔐");
    });
  } catch (error) {
    console.error("Failed to start Unfazed backend:", error.message);
    process.exit(1);
  }
}

startServer();
