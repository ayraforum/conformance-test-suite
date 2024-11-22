import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Docker from "dockerode";
import { Request, Response } from 'express';
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Initialize Docker client
const docker = new Docker();

// Middleware for parsing JSON
app.use(cors());
app.use(express.json());

// API Route: Start a Docker container by ID or name
app.post("/start-container", async (req: Request, res: Response): Promise<void> => {
  const { containerId } = req.body;

  if (!containerId) {
    res.status(400).json({ error: "Container ID is required" });
    return;
  }

  try {
    const container = docker.getContainer(containerId);
    await container.start();

    res.json({ message: `Container ${containerId} started` });

    // Stream logs to WebSocket room
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    const room = `logs-${containerId}`;
    logStream.on("data", (chunk) => {
      io.to(room).emit("log", chunk.toString());
    });

    logStream.on("end", () => {
      io.to(room).emit("log", `Logs streaming for container ${containerId} ended.`);
    });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error';
    res.status(500).json({
      error: `Failed to start container: ${errorMessage}`
    });
  }
});

// WebSocket: Join a room to listen for logs
io.on("connection", (socket) => {
  console.log("WebSocket client connected");

  // Handle joining a room
  socket.on("join-room", (room) => {
    console.log(`Client joined room: ${room}`);
    socket.join(room);
  });

  // Handle leaving a room
  socket.on("leave-room", (room) => {
    console.log(`Client left room: ${room}`);
    socket.leave(room);
  });

  socket.on("disconnect", () => {
    console.log("WebSocket client disconnected");
  });
});

// Start the server
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
