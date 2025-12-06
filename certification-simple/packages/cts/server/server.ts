// Ensure ngrok reads this path at module-load time
process.env.NGROK_CONFIG = process.env.NGROK_CONFIG || "/tmp/ngrok.yml";
// server.ts
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { state } from './state';
import VerifierTestPipeline from './pipelines/verifierTestPipeline';

import { createAgentConfig, BaseAgent, AgentController, CredoAgentAdapter, AcaPyAgentAdapter } from "@demo/core";
import * as ngrok from "@ngrok/ngrok";
import type { Config as NgrokConfig } from "@ngrok/ngrok";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from "uuid";
import { setDAG, setPipeline, setConfig, setAgent, setController, setIssuerController, setIssuerAgentType, state as serverState } from "./state";
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
function deriveAgentLabel() {
  const referenceAgent = (process.env.REFERENCE_AGENT || "credo").toLowerCase();
  const agentType = referenceAgent === "acapy" ? "ACA-Py" : "Credo";
  return `Ayra CTS Reference ${agentType} Agent`;
}

const agentLabel = deriveAgentLabel();
let activeNgrokListener: ngrok.Listener | null = null;
let acapyAdapter: AcaPyAgentAdapter | null = null;
const referenceAgent = (process.env.REFERENCE_AGENT ?? "credo").toLowerCase();
const issuerOverrideAgent = (
  process.env.ISSUER_OVERRIDE_AGENT ?? "auto"
).toLowerCase();
console.log(`[CONFIG] Reference agent: ${referenceAgent}`);
console.log(`[CONFIG] Issuer override agent: ${issuerOverrideAgent}`);

const resolveReferenceAgentDomain = (): string | null =>
  process.env.REFERENCE_AGENT_NGROK_DOMAIN ??
  process.env.ISSUER_NGROK_DOMAIN ??
  process.env.VERIFIER_NGROK_DOMAIN ??
  process.env.SERVER_NGROK_DOMAIN ??
  process.env.NGROK_DOMAIN ??
  null;

const resolveOverrideAgentDomain = (): string | null =>
  process.env.ISSUER_OVERRIDE_NGROK_DOMAIN ??
  process.env.CREDO_ISSUER_NGROK_DOMAIN ??
  process.env.ISSUER_NGROK_DOMAIN ??
  null;

const init = async () => {
  if (referenceAgent === "acapy") {
    await initCredoAgent();
    await initAcaPyController();
  } else {
    await initCredoAgent();
  }
  await configureIssuerController();
};

const initCredoAgent = async () => {
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
    const referenceDomain = resolveReferenceAgentDomain();
    const overrideDomain = resolveOverrideAgentDomain();
    let ngrokDomain: string | null = referenceDomain;
    // If reference and issuer are split, pick the appropriate domain.
    // Avoid colliding with the ACA-Py sidecar when both reference and issuer are ACA-Py:
    // in that case, prefer the issuer override domain for this app tunnel.
    if (referenceAgent !== "credo" && issuerOverrideAgent === "credo") {
      ngrokDomain = overrideDomain || referenceDomain;
    } else if (referenceAgent === "acapy" && issuerOverrideAgent === "acapy") {
      ngrokDomain = overrideDomain || referenceDomain;
    }
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
      agentLabel,
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
    const controller = new AgentController(new CredoAgentAdapter(agent));
    setController(controller);
    console.log("set agent and config");
  } else {
    const baseUrl = process.env.API_URL
      ? process.env.API_URL
      : "http://localhost:5005";
    if (!baseUrl) {
      throw new Error("BASE_URL not defined");
    }
    console.log("base url", baseUrl);
    const config = createAgentConfig(agentLabel, agentPort, agentId, baseUrl, [
      baseUrl,
    ]);
    setConfig(config);
    if (!config) {
      throw new Error("config not defined");
    }
    const agent = new BaseAgent(config);
    await agent.init();
    setAgent(agent);
    const controller = new AgentController(new CredoAgentAdapter(agent));
    setController(controller);
  }
};

const initAcaPyController = async () => {
  const baseUrl = process.env.ACAPY_CONTROL_URL ?? "http://localhost:9001";
  console.log(`[ACAPY] Connecting to control service at ${baseUrl}`);
  acapyAdapter = await AcaPyAgentAdapter.create({ baseUrl });
  const controller = new AgentController(acapyAdapter);
  setController(controller);
  console.log("[ACAPY] Controller initialized");
};

const shutdown = async () => {
  try {
    if (referenceAgent === "acapy" && acapyAdapter) {
      await acapyAdapter.shutdown();
    }
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

const configureIssuerController = async () => {
  const referenceAgent = (process.env.REFERENCE_AGENT ?? "credo").toLowerCase();
  if (issuerOverrideAgent === "auto") {
    const effective = referenceAgent === "acapy" ? "acapy" : "credo";
    setIssuerController(undefined);
    setIssuerAgentType(effective);
    process.env.ISSUER_EFFECTIVE_AGENT = effective;
    return;
  }
  if (issuerOverrideAgent === "acapy") {
    if (!acapyAdapter) {
      await initAcaPyController();
    }
    if (!acapyAdapter) {
      throw new Error("[Issuer Override] ACA-Py adapter not initialized");
    }
    const overrideController = new AgentController(acapyAdapter);
    setIssuerController(overrideController);
    console.log("[Issuer Override] Issuer controller set to ACA-Py");
    setIssuerAgentType("acapy");
    process.env.ISSUER_EFFECTIVE_AGENT = "acapy";
    return;
  }
  if (issuerOverrideAgent === "credo") {
    if (!serverState.agent) {
      throw new Error(
        "[Issuer Override] Credo agent not initialized; cannot create issuer controller"
      );
    }
    const overrideController = new AgentController(
      new CredoAgentAdapter(serverState.agent)
    );
    setIssuerController(overrideController);
    console.log("[Issuer Override] Issuer controller set to Credo agent");
    setIssuerAgentType("credo");
    process.env.ISSUER_EFFECTIVE_AGENT = "credo";
    return;
  }
  console.warn(
    `[Issuer Override] Unsupported ISSUER_OVERRIDE_AGENT=${issuerOverrideAgent}; defaulting to reference controller`
  );
  const fallback = referenceAgent === "acapy" ? "acapy" : "credo";
  setIssuerAgentType(fallback);
  process.env.ISSUER_EFFECTIVE_AGENT = fallback;
  setIssuerController(undefined);
};

export const reset = async () => {};
/**
 * Main function to set up and run the task pipeline.
 */
export const run = async (params?: any) => {
  await ensureInitialized();
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

let initializationPromise: Promise<void> | null = null;
let initialized = false;

const ensureInitialized = async (): Promise<void> => {
  if (initialized) {
    return;
  }
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await init();
    try {
      selectPipeline(PipelineType.HOLDER_TEST);
    } catch (e) {
      console.error(e);
    }
    initialized = true;
  })().catch((error) => {
    initializationPromise = null;
    initialized = false;
    throw error;
  });

  return initializationPromise;
};

console.log("initializing");
ensureInitialized().catch((e) => {
  console.error("Failed to initialize CTS server", e);
});

runServer();

export { ensureInitialized };
