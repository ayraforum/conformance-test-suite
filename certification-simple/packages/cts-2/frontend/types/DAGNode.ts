export interface TaskMetadata {
  name: string;
  id: string;
  description: string;
}

export interface TaskState {
  status: string;
  runState: string;
  warnings: string[];
  messages: string[];
  errors: string[];
}

export interface Task {
  id: string;
  metadata: TaskMetadata;
  state: TaskState;
}

export interface Node {
  id: string;
  name: string;
  description: string;
  state: string;
  finished: boolean;
  stopped: boolean;
  task: Task;
}

interface DAGState {
  status: string;
  runState: string;
}

interface DAGMetadata {
  name: string;
  id: string;
}

export interface DAG {
  status: DAGState;
  metadata: DAGMetadata;
  nodes: Node[];
}
