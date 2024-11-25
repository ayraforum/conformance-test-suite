import { Socket } from "socket.io";

export const handleConnection = (socket: Socket) => {
  console.log("WebSocket client connected");

  socket.on("join-room", (room) => {
    console.log(`Client joined room: ${room}`);
    socket.join(room);
  });

  socket.on("leave-room", (room) => {
    console.log(`Client left room: ${room}`);
    socket.leave(room);
  });

  socket.on("disconnect", () => {
    console.log("WebSocket client disconnected");
  });
};
