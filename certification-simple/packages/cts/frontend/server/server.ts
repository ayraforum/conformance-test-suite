import { SetupConnectionTask, RequestProofTask } from "../../../lib/core/agent/tasks";
import { createAgentConfig } from "../../../lib/core/agent/utils";
import ngrok from "ngrok";
import { v4 as uuidv4 } from "uuid";
import { BaseAgent } from "../../../lib/core/agent/core";
import { setDAG, setPipeline, setConfig, state, setAgent, selectPipeline, PipelineType } from "./state";
import { runServer } from "./api";
import { emitDAGUpdate } from "./ws";

// Agent configuration
const agentId = uuidv4();
const agentPort: number = Number(process.env.AGENT_PORT) || 5007; // Different port from main app

const init = async () => {
  if (process.env.USE_NGROK === "true") {
    if (!process.env.NGROK_AUTH_TOKEN) {
      throw new Error("NGROK_AUTH_TOKEN not defined");
    }

    console.log("CTS: connecting to ngrok...");
    const ngrokUrl = await ngrok.connect({
      addr: `http://127.0.0.1:${agentPort}`,
      proto: "http",
      authtoken: process.env.NGROK_AUTH_TOKEN,
    });
    console.log(`CTS: ngrok tunnel established at ${ngrokUrl}`);
    
    const config = createAgentConfig(
      "CTS Agent",
      agentPort,
      agentId,
      ngrokUrl,
      [ngrokUrl]
    );
    setConfig(config);
    
    if (!config) {
      throw new Error("config not defined");
    }
    
    const agent = new BaseAgent(config);
    console.log("CTS: creating agent");
    await agent.init();
    console.log("CTS: setting agent");
    setAgent(agent);
    console.log("CTS: agent and config set");
  } else {
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";
    console.log("CTS: base url", baseUrl);
    
    const config = createAgentConfig("CTS Agent", agentPort, agentId, baseUrl, [baseUrl]);
    setConfig(config);
    
    if (!config) {
      throw new Error("config not defined");
    }
    
    const agent = new BaseAgent(config);
    await agent.init();
    setAgent(agent);
  }
};

export const reset = async () => {
  // Reset state if needed
};

/**
 * Main function to set up and run the task pipeline.
 */
export const run = async () => {
  try {
    console.log("CTS: initializing agent...");
    const agent = state.agent;
    console.log("CTS: Agent initialized successfully.");
    
    if (!agent) {
      throw Error("agent not defined");
    }
    
    const pipeline = state.pipeline;
    if (!pipeline) {
      throw new Error("pipeline doesn't exist");
    }

    await pipeline.init();
    const dag = pipeline.dag();
    setDAG(dag);
    emitDAGUpdate();

    console.log("CTS: setup dag", dag);
    dag.onUpdate(() => {
      emitDAGUpdate();
    });

    // Start executing the DAG
    await dag.start();
    console.log("CTS: DAG execution started.");
  } catch (error) {
    console.error("CTS: An error occurred during execution:", error);
    throw error; // Don't exit process in library mode
  }
};

console.log("CTS: initializing");
try {
  init().then(() => {
    try {
      // Default to holder test pipeline
      selectPipeline(PipelineType.HOLDER_TEST);
      console.log("CTS: Default pipeline selected");
    } catch (e) {
      console.error("CTS: Error selecting default pipeline:", e);
    }
  });
} catch (e) {
  console.error("CTS: Error during initialization:", e);
}

// Start the API server
runServer();
