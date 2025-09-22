import { Server } from "socket.io";

let io;
let activeConnections = new Map();
let activeRooms = new Map();

function generateAnonymousId() {
  return [...Array(16)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}

function generateRoomId(length = 8) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return [...Array(length)]
    .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
    .join("");
}

function validateEncryptedMessage(encryptedMessage) {
  if (!encryptedMessage || typeof encryptedMessage !== "object") return false;
  const requiredFields = ["encrypted", "iv", "algorithm"];
  return (
    requiredFields.every((field) => field in encryptedMessage) &&
    encryptedMessage.algorithm === "AES-256-GCM" &&
    Array.isArray(encryptedMessage.iv) &&
    encryptedMessage.iv.length === 12 &&
    Array.isArray(encryptedMessage.encrypted) &&
    encryptedMessage.encrypted.length > 0
  );
}

function runCleanup() {
  const now = Date.now();
  let cleanedConnections = 0;
  let cleanedRooms = 0;

  // 🔹 Clean inactive connections (>30 min)
  for (const [socketId, connection] of activeConnections.entries()) {
    if (now - connection.lastActivity > 30 * 60 * 1000) {
      activeConnections.delete(socketId);
      cleanedConnections++;
    }
  }

  // 🔹 Clean inactive/empty rooms (>1 hr or no participants)
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.participants.size === 0 || now - room.lastActivity > 60 * 60 * 1000) {
      activeRooms.delete(roomId);
      cleanedRooms++;
    }
  }

  if (cleanedConnections > 0 || cleanedRooms > 0) {
    console.log(`🧹 Cleanup: ${cleanedConnections} connections, ${cleanedRooms} rooms`);
  }
}

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing new Socket.io server...");

    io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      transports: ["websocket", "polling"],
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      const anonymousId = generateAnonymousId();
      console.log(`🔐 Connected: ${anonymousId.substring(0, 8)}...`);

      activeConnections.set(socket.id, {
        anonymousId,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isAuthenticated: false,
        rooms: new Set(),
        profile: null,
      });

      // 🔹 Authentication
      socket.on("authenticate", () => {
        const sessionToken = generateAnonymousId();
        const conn = activeConnections.get(socket.id);
        if (conn) {
          conn.isAuthenticated = true;
          conn.lastActivity = Date.now();
        }
        socket.emit("authenticated", {
          success: true,
          anonymousId: anonymousId.substring(0, 8) + "...",
          sessionToken: sessionToken.substring(0, 8) + "...",
        });
      });

      // 🔹 Profile setup
      socket.on("setupProfile", (data) => {
        const connection = activeConnections.get(socket.id);
        if (!connection?.isAuthenticated)
          return socket.emit("error", { code: "NOT_AUTHENTICATED" });

        const displayName = data.displayName?.trim();
        if (!displayName || displayName.length > 50) {
          return socket.emit("profileSetupFailed", { error: "Invalid display name" });
        }

        connection.profile = { displayName, anonymousId };
        connection.lastActivity = Date.now();

        socket.emit("profileSetupComplete", {
          success: true,
          profile: { displayName, anonymousId },
        });
      });

      // 🔹 Create room
      socket.on("createRoom", () => {
        const connection = activeConnections.get(socket.id);
        if (!connection?.isAuthenticated)
          return socket.emit("error", { code: "NOT_AUTHENTICATED" });

        const roomId = generateRoomId();
        const room = { id: roomId, participants: new Set([socket.id]), lastActivity: Date.now() };
        activeRooms.set(roomId, room);
        connection.rooms.add(roomId);
        socket.join(roomId);

        socket.emit("roomCreated", {
          success: true,
          room: { id: roomId, participants: 1 },
        });
      });

      // 🔹 Join room
      socket.on("joinRoom", ({ roomCode }) => {
        const connection = activeConnections.get(socket.id);
        if (!connection?.isAuthenticated)
          return socket.emit("error", { code: "NOT_AUTHENTICATED" });

        let room = activeRooms.get(roomCode);
        if (!room) {
          room = { id: roomCode, participants: new Set(), lastActivity: Date.now() };
          activeRooms.set(roomCode, room);
        }

        room.participants.add(socket.id);
        room.lastActivity = Date.now();
        connection.rooms.add(roomCode);
        connection.lastActivity = Date.now();
        socket.join(roomCode);

        socket.emit("roomJoined", {
          success: true,
          room: { id: roomCode, participants: room.participants.size },
        });
        socket.to(roomCode).emit("userJoined", {
          participants: room.participants.size,
        });
      });

      // 🔹 Messaging
      socket.on("sendMessage", ({ roomId, encryptedMessage, messageId }) => {
        const connection = activeConnections.get(socket.id);
        if (!connection?.isAuthenticated) return;

        const room = activeRooms.get(roomId);
        if (!room?.participants.has(socket.id)) return;

        if (!validateEncryptedMessage(encryptedMessage)) {
          return socket.emit("messageSendFailed", {
            error: "Invalid message",
            messageId,
          });
        }

        const messageEnvelope = {
          messageId,
          roomId,
          sender: connection.profile?.displayName || "Anonymous",
          encryptedPayload: encryptedMessage,
          timestamp: Date.now(),
        };

        room.lastActivity = Date.now();
        connection.lastActivity = Date.now();

        socket.to(roomId).emit("newMessage", messageEnvelope);
        socket.emit("messageDelivered", { messageId, delivered: true });
      });

      // 🔹 File sharing
      socket.on("shareFile", ({ roomId, encryptedFile, fileMetadata, fileId }) => {
        const connection = activeConnections.get(socket.id);
        if (!connection?.isAuthenticated)
          return socket.emit("error", { code: "NOT_AUTHENTICATED" });

        const room = activeRooms.get(roomId);
        if (!room?.participants.has(socket.id))
          return socket.emit("fileShareFailed", { error: "Not a member", fileId });

        if (!encryptedFile || !fileMetadata || !fileId) {
          return socket.emit("fileShareFailed", { error: "Missing fields", fileId });
        }

        if (fileMetadata.size > 10 * 1024 * 1024) {
          return socket.emit("fileShareFailed", {
            error: "File too large (max 10MB)",
            fileId,
          });
        }

        const fileEnvelope = {
          fileId,
          roomId,
          sender: connection.profile?.displayName || "Anonymous",
          encryptedFileData: encryptedFile,
          fileMetadata: { ...fileMetadata, isEncrypted: true },
          timestamp: Date.now(),
        };

        room.lastActivity = Date.now();
        connection.lastActivity = Date.now();

        socket.to(roomId).emit("newFile", fileEnvelope);
        socket.emit("fileShared", { fileId, shared: true });
      });

      // 🔹 Typing indicator
      socket.on("typing", ({ roomId, isTyping }) => {
        socket.to(roomId).emit("userTyping", { isTyping });
      });

      // 🔹 Disconnect
      socket.on("disconnect", () => {
        console.log(`❌ Disconnected: ${anonymousId.substring(0, 8)}...`);
        activeConnections.delete(socket.id);
      });
    });

    // 🔹 Run cleanup every 5 minutes while instance is alive
    setInterval(runCleanup, 5 * 60 * 1000);

    res.socket.server.io = io;
  }

  res.end();
}

