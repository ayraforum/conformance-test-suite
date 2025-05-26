export class TaskNode {
  set task(task: TaskRunner) {
    console.log('TaskNode - State Update:', {
      nodeId: this.id,
      nodeName: this.name,
      previousState: this.state,
      newTaskState: task.state,
      isFinished: this.finished,
      timestamp: new Date().toISOString()
    });
    this._task = task;
  }
} 