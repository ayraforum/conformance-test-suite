import { Middleware } from '@reduxjs/toolkit';
import { RootState } from './index';
import { setCurrentStep, completeTest, addMessage } from './testSlice';
import { DAG } from '@/types/DAGNode';

// Middleware to handle automatic test progression based on DAG state
export const testProgressionMiddleware: Middleware<{}, RootState> = 
  (store) => (next) => (action) => {
    const result = next(action);
    
    // Only react to DAG updates
    if (action.type === 'dag/setDAG') {
      const state = store.getState();
      const dag: DAG = action.payload;
      const { isTestRunning, currentStep } = state.test;
      
      // Only process if test is running
      if (!isTestRunning || !dag.nodes || dag.nodes.length === 0) {
        return result;
      }

      console.log('TestProgressionMiddleware: Processing DAG update', {
        currentStep,
        nodeCount: dag.nodes.length,
        nodes: dag.nodes.map(n => ({
          name: n.name,
          status: n.task.state.status,
          runState: n.task.state.runState,
          finished: n.finished
        }))
      });

      // Add messages from DAG nodes to corresponding test steps
      dag.nodes.forEach((node, index) => {
        if (node.task.state.messages.length > 0) {
          node.task.state.messages.forEach(message => {
            store.dispatch(addMessage({ stepIndex: index, message }));
          });
        }
      });

      // Determine the new step based on DAG state
      let newStep = currentStep;

      // Check if all nodes are completed -> go to report step
      const allNodesCompleted = dag.nodes.every(node => 
        node.task.state.status === 'Accepted' && 
        (node.task.state.runState === 'Completed' || node.finished)
      );
      
      if (allNodesCompleted) {
        console.log('TestProgressionMiddleware: All nodes completed, moving to report');
        newStep = 2; // Report step
        store.dispatch(completeTest());
      } else {
        // Find the first running node
        const firstRunningNodeIndex = dag.nodes.findIndex(node => 
          node.task.state.runState === 'Running' || 
          node.task.state.status === 'Running' ||
          node.task.state.status === 'Started'
        );
        
        if (firstRunningNodeIndex !== -1) {
          newStep = firstRunningNodeIndex;
          console.log('TestProgressionMiddleware: Found running node at index', firstRunningNodeIndex);
        } else {
          // Find the last completed node and move to next step
          const completedNodeCount = dag.nodes.filter(node => 
            node.task.state.status === 'Accepted' || 
            node.task.state.runState === 'Completed' ||
            node.finished
          ).length;
          
          if (completedNodeCount > 0) {
            // Move to the step after the last completed one, but not beyond report step
            newStep = Math.min(completedNodeCount, 2);
            console.log('TestProgressionMiddleware: Completed nodes:', completedNodeCount, 'new step:', newStep);
          }
        }
      }

      // Update step if it changed
      if (newStep !== currentStep) {
        console.log('TestProgressionMiddleware: Step transition:', currentStep, '→', newStep);
        store.dispatch(setCurrentStep(newStep));
      }
    }
    
    return result;
  };
