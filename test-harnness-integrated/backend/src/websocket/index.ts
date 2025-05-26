import { Server } from "socket.io";
import { handleConnection } from "./handlers";

export const io = new Server(); // Create WebSocket server instance

// Attach event listeners
io.on("connection", (socket) => {
  handleConnection(socket); // Delegate connection handling
});
