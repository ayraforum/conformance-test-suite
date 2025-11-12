import express from "express";
import cors from "cors";
import { state } from "./state";
import http from "http";
const serverPort: number = Number(process.env.SERVER_PORT) || 5005;
import { run } from "./server";
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
  const pipelineName = req.query.pipeline as string;
  console.log("Selecting pipeline", pipelineName);
  if (pipelineName === PipelineType.ISSUER_TEST || pipelineName === PipelineType.REGISTRY_TEST || pipelineName === PipelineType.VERIFIER_TEST) {
    if (!state.agent) {
      return res.status(400).json({ error: "Credo agent not available in ACA-Py mode" });
    }
  }
  selectPipeline(pipelineName as PipelineType);
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
