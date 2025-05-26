import { ChildProcess } from "child_process";
import { io } from "../websocket";

type ProcessMap = Record<
  string,
  { process: ChildProcess; room: string }
>;

export const processes: ProcessMap = {};

type UpdateType = 'log' | 'status' | 'complete';
type LogType = 'stdout' | 'stderr' | 'error' | 'status';
type StatusState = 'completed' | 'failed' | 'running' | 'waiting';

interface UpdatePayload {
  type: LogType;
  message?: string;
  state?: StatusState;
  error?: string;
}

interface UpdateEmitter {
  emit: (type: UpdateType, payload: UpdatePayload) => void;
}

export class ProcessStreamManager {
  private room: string;

  constructor(private correlationId: string) {
    this.room = `updates-${correlationId}`;
  }

  private emit(type: UpdateType, payload: UpdatePayload) {
    io.to(this.room).emit('update', { type, payload }, this.correlationId);
  }

  logStdout(message: string) {
    this.emit('log', { type: 'stdout', message });
  }

  logStderr(message: string) {
    this.emit('log', { type: 'stderr', message });
  }

  logError(error: Error | string) {
    const message = error instanceof Error ? error.message : error;
    this.emit('log', { type: 'error', message });
    this.emit('status', { type: 'error', state: 'failed', error: message });
  }

  sendStatus(state: StatusState) {
    this.emit('status', { type: 'status', state });
  }

  complete(success: boolean, exitCode?: number) {
    if (exitCode !== undefined) {
      this.emit('log', {
        type: 'status',
        message: `Process exited with code ${exitCode}`
      });
    }

    this.emit('status', { type: 'status', state: success ? 'completed' : 'failed' });
    delete processes[this.correlationId];
  }
}

export const streamProcessUpdates = (childProcess: ChildProcess, correlationId: string) => {
  const manager = new ProcessStreamManager(correlationId);

  processes[correlationId] = {
    process: childProcess,
    room: `updates-${correlationId}`
  };

  childProcess.stdout?.on('data', (data) => {
    manager.logStdout(data.toString());
  });

  childProcess.stderr?.on('data', (data) => {
    manager.logStderr(data.toString());
  });

  childProcess.on('close', (code) => {
    manager.complete(code === 0, code ?? undefined);
  });

  childProcess.on('error', (error) => {
    manager.logError(error);
  });

  return manager;
};
