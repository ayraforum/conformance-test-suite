import { Server as SocketIOServer } from "socket.io";
import { state } from "./state";
import { server } from "./api";
import eventEmitter from "@demo/core/agent/utils/eventEmitter";
import { OutOfBandRecord } from "@credo-ts/core";

export const io = new SocketIOServer(server, {
  cors: {
    origin: `http://localhost:{appPort}`, // React app domain
    methods: ["GET", "POST"],
  },
});

export const emitDAGUpdate = () => {
  io.emit("dag-update", { dag: state?.dag?.serialize() });
};

eventEmitter.on("invitation", (event: OutOfBandRecord) => {
  if (state?.config?.domain) {
    const url = event.outOfBandInvitation.toUrl({
      domain: state!.config!.domain,
    });
    state.currentInvitation = url;
    io.emit("invitation", url);
    console.log("emitted invitation", url);
  }
});

// Handle Socket.io connections
io.on("connection", (socket: any) => {
  console.log("A user connected:", socket.id);
  socket.emit("dag-update", { dag: state?.dag?.serialize() });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
