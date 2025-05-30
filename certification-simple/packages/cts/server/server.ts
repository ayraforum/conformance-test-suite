// server.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { state } from './state';
import VerifierTestPipeline from './pipelines/verifierTestPipeline';

import {
  SetupConnectionTask,
  RequestProofTask,
  RequestProofOptions,
} from "@demo/core";
import { createAgentConfig, BaseAgent } from "@demo/core";
import ngrok from "ngrok";
import { v4 as uuidv4 } from "uuid";
import { setDAG, setPipeline, setConfig, setAgent } from "./state";
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
    const baseUrl = process.env.API_URL
      ? process.env.API_URL
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
export const run = async (params?: any) => {
  try {
    console.log("[RUN] Starting pipeline execution with params:", params);
    const agent = state.agent;
    console.log("Agent initialized successfully.");
    if (!agent) {
      throw Error("agent not defined");
    }
    const pipeline = state.pipeline;
    if (!pipeline) {
      throw new Error("pipeline doesn't exist");
    }

    // If we have an OOB URL and this is a VerifierTestPipeline, update it
    if (params?.oobUrl && 'setOobUrl' in pipeline && typeof pipeline.setOobUrl === 'function') {
      console.log("[RUN] Updating VerifierTestPipeline with OOB URL:", params.oobUrl);
      (pipeline as any).setOobUrl(params.oobUrl);
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
    emitDAGUpdate();
  } catch (error) {
    console.error("An error occurred during pipeline execution:", error);
    // Don't exit the process - just log the error and allow the server to continue
    // This allows other tests to still run even if one fails
    emitDAGUpdate(); // Still emit update to show error state
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
