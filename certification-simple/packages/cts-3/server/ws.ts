import { Server as SocketIOServer, Socket } from "socket.io";
import { state } from "./state";
import { server } from "./api";
import eventEmitter from "@demo/core/agent/utils/eventEmitter";
import { OutOfBandRecord } from "@credo-ts/core";

console.log("Initializing Socket.IO server...");

export const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 120000,     // Increased timeout
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  maxHttpBufferSize: 1e8,  // Increase buffer size
  httpCompression: false,   // Disable compression for faster delivery
});

let updateSequence = 0;
let lastAcknowledgedSequence = 0;

export const emitDAGUpdate = () => {
  const serializedDag = state?.dag?.serialize();
  const sequence = ++updateSequence;
  
  // Detailed DAG state logging for debugging
  console.log('WebSocket - Emitting DAG State:', {
    sequence,
    dagState: serializedDag?.status,
    connectedClients: io.engine.clientsCount,
    nodeStates: serializedDag?.nodes?.map(n => ({
      name: n.name,
      state: n.state,
      finished: n.finished,
      taskStatus: n.task?.state?.status,
      taskRunState: n.task?.state?.runState
    }))
  });
  
  const emitData = { sequence, dag: serializedDag };
  
  // Use the working event name only
  io.emit("dag-state-update", emitData);
  
  // Log successful emission
  console.log(`WebSocket - Broadcasted dag-state-update ${sequence} to ${io.engine.clientsCount} clients`);
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
io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);
  console.log("Socket transport:", socket.conn.transport.name);
  console.log("Total connected clients:", io.engine.clientsCount);
  
  // Send initial state with current sequence
  const initialData = { 
    sequence: updateSequence,
    dag: state?.dag?.serialize()
  };
  
  console.log('WebSocket - Sending initial state to new client:', {
    clientId: socket.id,
    sequence: updateSequence,
    dagState: initialData.dag?.status,
    nodeCount: initialData.dag?.nodes?.length
  });
  
  socket.emit("dag-state-update", initialData);

  // Add heartbeat test - send a simple message every 2 seconds
  let heartbeatCount = 0;
  const heartbeatInterval = setInterval(() => {
    heartbeatCount++;
    const heartbeatMessage = {
      type: 'heartbeat',
      count: heartbeatCount,
      timestamp: new Date().toISOString(),
      socketId: socket.id
    };
    
    console.log(`Heartbeat ${heartbeatCount} sent to client ${socket.id}`);
    socket.emit('heartbeat', heartbeatMessage);
  }, 2000);

  // Handle acknowledgment (keep for debugging)
  socket.on("dag-update-ack", (ack: { sequence: number }) => {
    if (ack && ack.sequence) {
      lastAcknowledgedSequence = Math.max(lastAcknowledgedSequence, ack.sequence);
      console.log('WebSocket - Update Acknowledged:', {
        sequence: ack.sequence,
        lastAcknowledgedSequence,
        clientId: socket.id
      });
    }
  });

  // Handle heartbeat responses
  socket.on('heartbeat-response', (data: any) => {
    console.log(`Heartbeat response received from ${socket.id}:`, data);
  });

  socket.on("disconnect", (reason: string) => {
    console.log("User disconnected:", socket.id, "Reason:", reason);
    console.log("Remaining connected clients:", io.engine.clientsCount);
    // Clean up heartbeat interval
    clearInterval(heartbeatInterval);
  });

  socket.on("error", (error: Error) => {
    console.error("Socket error for client", socket.id, ":", error);
    // Clean up heartbeat interval on error
    clearInterval(heartbeatInterval);
  });
});
