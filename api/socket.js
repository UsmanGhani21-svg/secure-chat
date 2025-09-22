// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: "/api/socket",
  cors: { origin: "*" },
});

// ✅ Serve static frontend (public folder)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Root route → index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------- CORE DATA STRUCTURES --------------------
let activeConnections = new Map(); // socketId -> connection info
let activeRooms = new Map();       // roomId -> room info

// -------------------- HELPERS --------------------
function generateAnonymousId() {
  return [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateRoomId(length = 8) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return [...Array(length)].map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

function runCleanup() {
  const now = Date.now();
  // Clean connections
  for (const [socketId, conn] of activeConnections.entries()) {
    if (now - conn.lastActivity > 30 * 60 * 1000) {
      activeConnections.delete(socketId);
    }
  }
  // Clean rooms
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.participants.size === 0 || now - room.lastActivity > 60 * 60 * 1000) {
      activeRooms.delete(roomId);
    }
  }
}
setInterval(runCleanup, 5 * 60 * 1000);

// -------------------- SOCKET HANDLERS --------------------
io.on("connection", (socket) => {
  const anonymousId = generateAnonymousId();
  console.log(`✅ Connected: ${anonymousId.substring(0, 8)}...`);

  activeConnections.set(socket.id, {
    anonymousId,
    connectedAt: Date.now(),
    lastActivity: Date.now(),
    isAuthenticated: false,
    rooms: new Set(),
    profile: null,
  });

  // Authentication
  socket.on("authenticate", (token) => {
    const conn = activeConnections.get(socket.id);
    if (conn) {
      conn.isAuthenticated = true;
      conn.lastActivity = Date.now();
      socket.emit("authenticated", { success: true });
    }
  });

  // Profile setup
  socket.on("setupProfile", (profile) => {
    const conn = activeConnections.get(socket.id);
    if (conn) {
      conn.profile = profile;
      conn.lastActivity = Date.now();
      socket.emit("profileSetup", { success: true });
    }
  });

  // Create Room
  socket.on("createRoom", () => {
    const roomId = generateRoomId();
    activeRooms.set(roomId, {
      participants: new Set([socket.id]),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    activeConnections.get(socket.id)?.rooms.add(roomId);
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
  });

  // Join Room
  socket.on("joinRoom", (roomId) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.participants.add(socket.id);
      room.lastActivity = Date.now();
      activeConnections.get(socket.id)?.rooms.add(roomId);
      socket.join(roomId);
      socket.emit("roomJoined", { success: true, roomId });
      socket.to(roomId).emit("userJoined", { userId: socket.id });
    } else {
      socket.emit("roomJoined", { success: false, error: "Room not found" });
    }
  });

  // Messaging
  socket.on("sendMessage", ({ roomId, message }) => {
    const conn = activeConnections.get(socket.id);
    if (conn && conn.rooms.has(roomId)) {
      conn.lastActivity = Date.now();
      const enriched = {
        message,
        sender: conn.profile || { anonymousId: conn.anonymousId },
        timestamp: Date.now(),
      };
      io.to(roomId).emit("newMessage", enriched);
    }
  });

  // File Sharing
  socket.on("shareFile", ({ roomId, fileData }) => {
    const conn = activeConnections.get(socket.id);
    if (conn && conn.rooms.has(roomId)) {
      conn.lastActivity = Date.now();
      const enriched = {
        fileData,
        sender: conn.profile || { anonymousId: conn.anonymousId },
        timestamp: Date.now(),
      };
      io.to(roomId).emit("fileShared", enriched);
    }
  });

  // Typing Indicator
  socket.on("typing", ({ roomId, isTyping }) => {
    const conn = activeConnections.get(socket.id);
    if (conn && conn.rooms.has(roomId)) {
      socket.to(roomId).emit("userTyping", {
        userId: socket.id,
        isTyping,
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${anonymousId.substring(0, 8)}...`);
    activeConnections.delete(socket.id);
    for (const [roomId, room] of activeRooms.entries()) {
      room.participants.delete(socket.id);
      if (room.participants.size === 0) {
        activeRooms.delete(roomId);
      } else {
        socket.to(roomId).emit("userLeft", { userId: socket.id });
      }
    }
  });
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
