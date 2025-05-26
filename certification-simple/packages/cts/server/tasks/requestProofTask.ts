async run(): Promise<void> {
  try {
    // ... existing code ...
    
    // When task completes
    console.log('RequestProofTask - Task Completion:', {
      taskId: this.id,
      finalState: {
        status: this.state.status,
        runState: this.state.runState
      },
      messages: this.state.messages,
      timestamp: new Date().toISOString()
    });
    
    this.state.status = "Accepted";
    this.state.runState = "Completed";
  } catch (error) {
    // ... existing code ...
  }
} 