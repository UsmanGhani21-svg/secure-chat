// // server/index.js
// const express = require("express");
// const http = require("http");
// const path = require("path");
// const { Server } = require("socket.io");
// const socketHandler = require("./socket"); // Import socket logic

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*", // ⚠️ Allow all origins for dev/testing. Restrict in prod.
//     methods: ["GET", "POST"],
//   },
// });

// // Serve static frontend
// app.use(express.static(path.join(__dirname, "../public")));

// // Root route -> index.html
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "../public/index.html"));
// });

// // Initialize socket logic
// socketHandler(io);

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT,"0.0.0.0", () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import initSocket from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ Serve static frontend from /public
app.use(express.static(path.join(__dirname, "../public")));

// ✅ Fallback route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Initialize socket.io
initSocket(io);

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
