// Ensure ngrok reads this path at module-load time
process.env.NGROK_CONFIG = process.env.NGROK_CONFIG || "/tmp/ngrok.yml";
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
import * as ngrok from "@ngrok/ngrok";
import type { Config as NgrokConfig } from "@ngrok/ngrok";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from "uuid";
import { setDAG, setPipeline, setConfig, setAgent } from "./state";
import { PipelineType } from "./pipelines";
import { runServer } from "./api";
import { emitDAGUpdate } from "./ws";
import { selectPipeline } from "./state";


function ensureNgrokConfig(): string {
  const token = process.env.NGROK_AUTH_TOKEN || process.env.NGROK_AUTHTOKEN;
  if (!token) throw new Error("NGROK_AUTH_TOKEN not defined");

  const cfgDir = '/root/.config/ngrok';
  const cfgPath = path.join(cfgDir, 'ngrok.yml');

  try {
    fs.mkdirSync(cfgDir, { recursive: true });
    if (!fs.existsSync(cfgPath)) {
      const contents = `version: "2"\nauthtoken: ${token}\n`;
      fs.writeFileSync(cfgPath, contents, { encoding: 'utf8' });
    }
    process.env.NGROK_CONFIG = cfgPath;
    process.env.NGROK_AUTHTOKEN = token;
    process.env.NGROK_AUTH_TOKEN = token;
    return cfgPath;
  } catch (e) {
    console.error('Failed to ensure ngrok config:', e);
    throw e;
  }
}

/*
 * setup
 */
const agentId = uuidv4();
const agentPort: number = Number(process.env.AGENT_PORT) || 5006; // ngrok port
let activeNgrokListener: ngrok.Listener | null = null;

const init = async () => {
  if (process.env.USE_NGROK === "true") {
    if (!process.env.NGROK_AUTH_TOKEN) {
      throw new Error("NGROK_AUTH_TOKEN not defined");
    }

    try {
      console.log("Cleaning up existing ngrok tunnels...");
      // Disconnect any tunnels this process previously opened
      await ngrok.disconnect();
      // Best-effort kill of any ngrok daemon spawned in prior runs
      await ngrok.kill();

      // Extra cleanup: terminate any leftover ngrok daemons if pkill exists
      const { execSync } = await import("child_process");
      try {
        execSync('sh -lc "command -v pkill >/dev/null 2>&1 && pkill -f ngrok || true"');
        console.log("Any existing ngrok processes terminated (if present).");
      } catch (e) {
        console.warn("pkill not available; skipping explicit ngrok process kill.");
      }
    } catch (cleanupErr) {
      console.warn("Ngrok cleanup warning:", cleanupErr);
    }

    const cfgPath = ensureNgrokConfig();
    console.log("Using NGROK_CONFIG:", cfgPath);
    console.log("connecting to ngrok...");

    let listener: ngrok.Listener | null = null;
    const poolingEnabled = (process.env.NGROK_POOLING_ENABLED ?? 'true').toLowerCase() === 'true';
    const ngrokDomain = process.env.SERVER_NGROK_DOMAIN || process.env.NGROK_DOMAIN || null;
    try {
      const config: NgrokConfig & { pooling_enabled?: boolean } = {
        addr: agentPort,
        proto: 'http',
        authtoken: process.env.NGROK_AUTH_TOKEN,
        region: process.env.NGROK_REGION || 'us',
      };
      if (poolingEnabled) {
        config.pooling_enabled = true;
      }
      if (ngrokDomain) {
        config.domain = ngrokDomain;
        console.log(`Requesting ngrok domain: ${ngrokDomain}`);
      }
      listener = await ngrok.connect(config);
    } catch (err) {
      console.error('Failed to establish ngrok tunnel', err);
      throw err;
    }

    const ngrokUrl = listener?.url();
    if (!ngrokUrl) {
      throw new Error('ngrok tunnel did not return a public url');
    }

    console.log(`ngrok tunnel established at ${ngrokUrl}`);
    activeNgrokListener = listener;
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

const shutdown = async () => {
  try {
    if (activeNgrokListener) {
      await activeNgrokListener.close();
      activeNgrokListener = null;
    }
    await ngrok.disconnect();
    await new Promise((r) => setTimeout(r, 300));
    await ngrok.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export const reset = async () => {};
/**
 * Main function to set up and run the task pipeline.
 */
export const run = async (params?: any) => {
  try {
    console.log("[RUN] Starting pipeline execution with params:", params);
    if (params?.pipelineType) {
      const pipelineType = params.pipelineType as PipelineType;
      console.log("[RUN] Pipeline override requested:", pipelineType);
      if (Object.values(PipelineType).includes(pipelineType)) {
        try {
          selectPipeline(pipelineType);
        } catch (error) {
          console.error("[RUN] Failed to select requested pipeline:", error);
          throw error;
        }
      } else {
        console.warn("[RUN] Ignoring unknown pipeline override:", params.pipelineType);
      }
    }
    const agent = state.agent;
    console.log("Agent initialized successfully.");
    if (!agent) {
      throw Error("agent not defined");
    }
    const pipeline = state.pipeline;
    if (!pipeline) {
      throw new Error("pipeline doesn't exist");
    }
    console.log("[RUN] Using pipeline:", pipeline.constructor?.name);

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
