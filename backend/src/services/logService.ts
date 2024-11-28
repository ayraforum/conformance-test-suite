import { ChildProcess } from "child_process";
import { io } from "../websocket";

type ProcessMap = Record<
  string,
  { process: ChildProcess; room: string }
>;

export const processes: ProcessMap = {};

/**
 * Stream logs to a WebSocket room.
 */
export const streamLogs = (childProcess: ChildProcess, room: string, correlationId: string) => {
  // Store the process in the global map
  processes[correlationId] = { process: childProcess, room };

  // Stream stdout logs
  childProcess.stdout?.on("data", (data) => {
    io.to(room).emit("log", { type: "stdout", message: data.toString() }, correlationId);
  });

  // Stream stderr logs
  childProcess.stderr?.on("data", (data) => {
    io.to(room).emit("log", { type: "stderr", message: data.toString() }, correlationId);
  });

  // Handle process completion
  childProcess.on("close", (code) => {
    io.to(room).emit("log", { type: "status", message: `Process exited with code ${code}` }, correlationId);
    io.to(room).emit("log-complete", correlationId);
    delete processes[correlationId];
  });

  // Handle errors
  childProcess.on("error", (error) => {
    io.to(room).emit("log", { type: "error", message: error.message }, correlationId);
    delete processes[correlationId];
  });
};
