// server.ts

import {
  SetupConnectionTask,
  RequestProofTask,
  RequestProofOptions,
} from "@demo/core/agent/tasks";
import { createAgentConfig } from "@demo/core/agent/utils";
import ngrok from "ngrok";

import { v4 as uuidv4 } from "uuid";
import { BaseAgent } from "@demo/core/agent/core";
import { setDAG, setPipeline, setConfig, state, setAgent } from "./state";
import { PipelineType } from "./pipelines";
import { runServer } from "./api";
import { emitDAGUpdate } from "./ws";
import { selectPipeline } from "./state";

/*
 * setup
 */
const agentId = uuidv4();
const agentPort: number = Number(process.env.AGENT_PORT) || 5006; // ngrok port

const init = async () => {
  if (process.env.USE_NGROK === "true") {
    if (!process.env.NGROK_AUTH_TOKEN) {
      throw new Error("NGROK_AUTH_TOKEN not defined");
    }

    console.log("connecting to ngrok...");
    const ngrokUrl = await ngrok.connect({
      addr: `http://127.0.0.1:${agentPort}`,
      proto: "http",
      authtoken: process.env.NGROK_AUTH_TOKEN, // Ensure this is set
    });
    console.log(`ngrok tunnel established at ${ngrokUrl}`);
    const config = createAgentConfig(
      "GAN Agent",
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
    console.log("creating agent");
    await agent.init();
    console.log("setting agent");
    setAgent(agent);
    console.log("set agent and config");
  } else {
    const baseUrl = process.env.BASE_URL
      ? process.env.BASE_URL
      : "http://localhost:5005";
    if (!baseUrl) {
      throw new Error("BASE_URL not defined");
    }
    console.log("base url", baseUrl);
    const config = createAgentConfig("GAN Agent", agentPort, agentId, baseUrl, [
      baseUrl,
    ]);
    setConfig(config);
    if (!config) {
      throw new Error("config not defined");
    }
    const agent = new BaseAgent(config);
    await agent.init();
    setAgent(agent);
  }
};

export const reset = async () => {};
/**
 * Main function to set up and run the task pipeline.
 */
export const run = async () => {
  try {
    console.log("initializing agent...");
    const agent = state.agent;
    console.log("Agent initialized successfully.");
    if (!agent) {
      throw Error("agent not defined");
    }
    const pipeline = state.pipeline;
    if (!pipeline) {
      throw new Error("pipline doesn't exist");
    }

    await pipeline.init();
    const dag = pipeline.dag();
    setDAG(dag);
    emitDAGUpdate();

    console.log("setup dag", dag);
    dag.onUpdate(() => {
      emitDAGUpdate();
    });

    // Start executing the DAG
    await dag.start();
    console.log("DAG execution started.");
  } catch (error) {
    console.error("An error occurred during execution:", error);
    process.exit(1); // Exit with an error code if something failed
  }
};

console.log("initializing");
try {
  init().then(() => {
    try {
      selectPipeline(PipelineType.HOLDER_TEST);
    } catch (e) {
      console.error(e);
    }
  });
} catch (e) {
  console.error(e);
}

runServer();
