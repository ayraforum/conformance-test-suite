import { ChildProcess } from "child_process";
import { io } from "../websocket";

type ProcessMap = Record<
  string,
  { process: ChildProcess; room: string }
>;

export const processes: ProcessMap = {};

/**
 * Stream process updates to a WebSocket room.
 */
export const streamProcessUpdates = (childProcess: ChildProcess, correlationId: string) => {
  const room = `updates-${correlationId}`;

  // Store the process in the global map
  processes[correlationId] = {
    process: childProcess,
    room
  };

  // Stream stdout logs
  childProcess.stdout?.on("data", (data) => {
    io.to(room).emit("update", {
      type: "log",
      payload: { type: "stdout", message: data.toString() }
    }, correlationId);
  });

  // Stream stderr logs
  childProcess.stderr?.on("data", (data) => {
    io.to(room).emit("update", {
      type: "log",
      payload: { type: "stderr", message: data.toString() }
    }, correlationId);
  });

  // Handle process completion
  childProcess.on("close", (code) => {
    io.to(room).emit("update", {
      type: "log",
      payload: { type: "status", message: `Process exited with code ${code}` }
    }, correlationId);

    io.to(room).emit("update", {
      type: "status",
      payload: { state: code === 0 ? 'completed' : 'failed' }
    }, correlationId);

    io.to(room).emit("update", { type: "complete" }, correlationId);
    delete processes[correlationId];
  });

  // Handle errors
  childProcess.on("error", (error) => {
    io.to(room).emit("update", {
      type: "log",
      payload: { type: "error", message: error.message }
    });

    io.to(room).emit("update", {
      type: "status",
      payload: { state: 'failed', error: error.message }
    });

    delete processes[correlationId];
  });
};
