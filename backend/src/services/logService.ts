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
export const streamLogs = (childProcess: ChildProcess, room: string, id: string) => {
  // Store the process in the global map
  processes[id] = { process: childProcess, room };

  // Stream stdout logs
  childProcess.stdout?.on("data", (data) => {
    io.to(room).emit("log", { type: "stdout", message: data.toString() });
  });

  // Stream stderr logs
  childProcess.stderr?.on("data", (data) => {
    io.to(room).emit("log", { type: "stderr", message: data.toString() });
  });

  // Handle process completion
  childProcess.on("close", (code) => {
    io.to(room).emit("log", { type: "status", message: `Process exited with code ${code}` });
    io.to(room).emit("log-complete");
    delete processes[id];
  });

  // Handle errors
  childProcess.on("error", (error) => {
    io.to(room).emit("log", { type: "error", message: error.message });
    delete processes[id];
  });
};
