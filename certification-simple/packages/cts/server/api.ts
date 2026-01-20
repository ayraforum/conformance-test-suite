import express from "express";
import cors from "cors";
import { state } from "./state";
import http from "http";
const serverPort: number = Number(process.env.SERVER_PORT) || 5005;
import { run, ensureInitialized, ensureAcaPyVerifierControllerInitialized } from "./server";
import { selectPipeline } from "./state";
import { PipelineType } from "./pipelines";

import { Express } from "express";
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add a root route for debugging
app.get('/', (req, res) => {
  res.json({ message: 'CTS API Server', timestamp: new Date().toISOString() });
});

// API routes
app.get("/api/dag", (req, res) => {
  res.json({ dag: state?.dag?.serialize() });
});

app.get("/api/health", (req, res) => {
  const agentStatus = state.agent
    ? "initialized"
    : state.controller
      ? "controller-only"
      : "not initialized";
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    agent: agentStatus,
    pipeline: state.pipeline ? "selected" : "none"
  });
});

app.post("/api/run", (req, res) => {
  // Accept parameters from the request body
  const params = req.body;
  console.log("[API] Received run request with params:", params);

  // Send response immediately
  res.json({ message: "Pipeline kickoff initiated" });

  state.currentInvitation = "";
  // Run the pipeline asynchronously in the background
  (async () => {
    try {
      await run(params); // Pass params to run
      console.log("Pipeline execution completed");
    } catch (error) {
      console.error("Error during pipeline execution:", error);
    }
  })();
});

app.get("/api/select/pipeline", async (req, res) => {
  try {
    await ensureInitialized();
  } catch (error) {
    console.error("Failed to initialize before selecting pipeline:", error);
    return res.status(500).json({ error: "CTS server not initialized yet" });
  }
  // Historical clients have used different query param names; accept a few.
  const pipelineName =
    (req.query.pipeline as string | undefined) ??
    (req.query.type as string | undefined) ??
    (req.query.pipelineType as string | undefined);
  console.log("Selecting pipeline", pipelineName);
  if (!pipelineName) {
    return res.status(400).json({
      error: "Missing pipeline query parameter",
      expected: "pipeline",
      allowed: Object.values(PipelineType),
    });
  }
  if (!Object.values(PipelineType).includes(pipelineName as PipelineType)) {
    return res.status(400).json({
      error: `Unknown pipeline '${pipelineName}'`,
      allowed: Object.values(PipelineType),
    });
  }
  // In ACA-Py reference mode, issuer/verifier demo flows do not require a Credo agent.
  // Registry tests still require it.
  const referenceAgent = (process.env.REFERENCE_AGENT || "credo").split("#")[0].trim().split(/\s+/)[0].toLowerCase();
  const issuerOverride = (process.env.REFERENCE_ISSUER_OVERRIDE_AGENT || "auto")
    .split("#")[0]
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
  const effectiveIssuerAgent =
    issuerOverride === "auto" ? referenceAgent : issuerOverride;
  if (effectiveIssuerAgent !== "acapy" && effectiveIssuerAgent !== "credo") {
    return res.status(400).json({
      error: `Unsupported REFERENCE_ISSUER_OVERRIDE_AGENT='${issuerOverride}'`,
      expected: ["auto", "credo", "acapy"],
    });
  }
  if (pipelineName === PipelineType.REGISTRY_TEST && !state.agent) {
    return res.status(400).json({ error: "Registry test requires a Credo agent" });
  }
  if (pipelineName === PipelineType.ISSUER_TEST && effectiveIssuerAgent === "credo" && !state.agent) {
    return res.status(400).json({ error: "Issuer test requires a Credo agent" });
  }
  if (referenceAgent !== "acapy") {
    if (
      pipelineName === PipelineType.ISSUER_TEST ||
      pipelineName === PipelineType.REGISTRY_TEST ||
      pipelineName === PipelineType.VERIFIER_TEST
    ) {
      if (!state.agent) {
        return res.status(400).json({ error: "Credo agent not initialized" });
      }
    }
  }
  if (referenceAgent === "acapy") {
    const verifierAutoSend =
      ((process.env.ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST || "false").split("#")[0].trim().toLowerCase() === "true");
    const needsDemoVerifierController =
      pipelineName === PipelineType.VERIFIER_TEST && verifierAutoSend;
    if (needsDemoVerifierController) {
      try {
        await ensureAcaPyVerifierControllerInitialized();
      } catch (e) {
        console.warn(
          `[API] Demo verifier controller not available; continuing without it: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }
  }
  try {
    selectPipeline(pipelineName as PipelineType);
  } catch (error) {
    console.error("Failed to select pipeline:", error);
    return res.status(500).json({
      error: "Failed to select pipeline",
      details: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    const { emitDAGUpdate } = await import("./ws");
    emitDAGUpdate();
  } catch (error) {
    console.error("Failed to emit DAG update after pipeline selection:", error);
  }
  res.json({ message: "Pipeline selected" });
});

app.get("/api/invitation", (req, res) => {
  res.json({ invite: state?.currentInvitation });
});

app.post("/api/card-format", (req, res) => {
  let fmt = (req.body?.format || "").toLowerCase();
  if (fmt !== "anoncreds" && fmt !== "w3c") {
    return res.status(400).json({ error: "format must be 'anoncreds' or 'w3c'" });
  }
  const referenceAgent = (process.env.REFERENCE_AGENT || "credo").split("#")[0].trim().split(/\s+/)[0].toLowerCase();
  const issuerOverride = (process.env.REFERENCE_ISSUER_OVERRIDE_AGENT || "auto")
    .split("#")[0]
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
  const effectiveIssuerAgent =
    issuerOverride === "auto" ? referenceAgent : issuerOverride;
  const allowAcaPyAnonCreds = (process.env.ALLOW_ACAPY_ANONCREDS || "false").split("#")[0].trim().toLowerCase() === "true";
  // In ACA-Py issuer mode, AnonCreds requires an explicit opt-in (it needs an AnonCreds-enabled profile).
  if (effectiveIssuerAgent === "acapy" && !allowAcaPyAnonCreds && fmt === "anoncreds") {
    fmt = "w3c";
  }
  const { setCredentialFormat } = require("./state");
  setCredentialFormat(fmt);
  res.json({ format: fmt });
});

app.get("/api/card-format", (req, res) => {
  res.json({ format: state?.credentialFormat ?? null });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    url: req.originalUrl,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/run',
      'GET /api/dag',
      'GET /api/select/pipeline',
      'GET /api/invitation'
    ]
  });
});

const server = http.createServer(app);

const runServer = () => {
  server.listen(serverPort, () => {
    console.log(`API Server listening at http://localhost:${serverPort}`);
    console.log('Available routes:');
    console.log('  GET /');
    console.log('  GET /api/health');
    console.log('  POST /api/run');
    console.log('  GET /api/dag');
    console.log('  GET /api/select/pipeline');
    console.log('  GET /api/invitation');
  });
};

export { app, server, runServer };
