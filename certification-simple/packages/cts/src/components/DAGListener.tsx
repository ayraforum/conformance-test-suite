import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { setDAG } from "../store/dagSlice";
import NodeCard from "./dag/NodeCard";

import { DAG } from "../types/DAGNode";
import { getSocket } from "../utils/socketManager";
const DAGListener: React.FC = () => {
  const dispatch = useDispatch();
  const connectionStatus = useSelector(
    (state: RootState) => state.socket.connectionStatus
  );
  const [color, setColor] = useState<string>("");

  const dag = useSelector((state: RootState) => state.dag.dag);
  const error = useSelector((state: RootState) => state.socket.error);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      console.log('DAGListener: Setting up dag-update listener');
      
      const handleDAGUpdate = (data: { sequence: number; dag: DAG }, callback?: Function) => {
        console.log('DAGListener: Received dag-update:', {
          sequence: data.sequence,
          dagStatus: data.dag?.status,
          nodeCount: data.dag?.nodes?.length
        });
        
        dispatch(setDAG(data.dag));
        
        // Send acknowledgment
        if (callback) {
          callback({ received: true, sequence: data.sequence });
        }
      };
      
      socket.on("dag-update", handleDAGUpdate);
      
      // Handle connection events
      socket.on('connect', () => {
        console.log('DAGListener: Socket connected');
      });
      
      socket.on('disconnect', (reason) => {
        console.log('DAGListener: Socket disconnected:', reason);
      });

      return () => {
        console.log('DAGListener: Cleaning up socket listeners');
        socket.off("dag-update", handleDAGUpdate);
        socket.off('connect');
        socket.off('disconnect');
      };
    } else {
      console.warn('DAGListener: No socket available');
    }
  }, [dispatch]);

  useEffect(() => {}, [dag]);

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case "connecting":
        return <span className="status connecting">Connecting...</span>;
      case "connected":
        return <span className="status connected">Connected</span>;
      case "disconnected":
        return <span className="status disconnected">Disconnected</span>;
      default:
        return null;
    }
  };

  useEffect(() => {
    var allPassed = dag?.nodes.every((node) => {
      return node.task.state.status === "Accepted";
    });
    if (allPassed) {
      setColor("bg-green-900");
      return;
    }
    var hasFailure = dag?.nodes.some((node) => {
      return node.task.state.status === "Failed";
    });
    if (hasFailure) {
      setColor("bg-red-500");
    }
    setColor("");
  }, [dag]);

  return (
    <div>
      <div className={`p-4 rounded-lg shadow-lg ${color}`}>
        <h2 className="text-4xl mb-4">{dag?.metadata.name}</h2>
        {dag ? (
          <div className="dag-nodes">
            {dag.nodes.map((node, index) => (
              <NodeCard node={node} key={index} />
            ))}
          </div>
        ) : (
          <p>No DAG data available.</p>
        )}
        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DAGListener;
