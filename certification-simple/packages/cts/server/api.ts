import express from "express";
import cors from "cors";
import { state, setTRQPDID, setTRQPEndpoint } from "./state";
import http from "http";
const serverPort: number = Number(process.env.SERVER_PORT) || 5005; // ngrok port
import { run } from "./server";
import { selectPipeline } from "./state";
import { PipelineType } from "./pipelines";
import { TRQPTesterPipeline } from "./pipelines";

import { Express } from "express";
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Get DAG state
app.get("/api/dag", (req, res) => {
  res.json({ dag: state?.dag?.serialize() });
});

// Run the pipeline
app.get("/api/run", (req, res) => {
  // Send response immediately
  res.json({ message: "Pipeline kickoff initiated" });

  state.currentInvitation = "";
  // Run the pipeline asynchronously in the background
  (async () => {
    try {
      await run(); // Ensure that the run function is awaited to handle errors properly
      console.log("Pipeline execution completed");
    } catch (error) {
      console.error("Error during pipeline execution:", error);
    }
  })();
});

// Select pipeline
app.get("/api/select/pipeline", (req, res) => {
  const pipelineName = req.query.pipeline as string;
  console.log("Selecting pipeline", pipelineName);
  selectPipeline(pipelineName as PipelineType);
  res.json({ message: "Pipeline selected" });
});

// Get invitation
app.get("/api/invitation", (req, res) => {
  res.json({ invite: state?.currentInvitation });
});

// Set TRQP DID for testing
app.post("/api/trqp/did", (req, res) => {
  const { did } = req.body;
  if (!did) {
    return res.status(400).json({ error: "DID is required" });
  }
  
  setTRQPDID(did);
  
  // If TRQP pipeline is already selected, update it
  if (state.pipeline && state.pipeline instanceof TRQPTesterPipeline) {
    (state.pipeline as TRQPTesterPipeline).setDID(did);
  }
  
  res.json({ message: "TRQP DID set successfully", did });
});

// Set TRQP Endpoint for testing
app.post("/api/trqp/endpoint", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint is required" });
  }
  
  setTRQPEndpoint(endpoint);
  
  // If TRQP pipeline is already selected, update it
  if (state.pipeline && state.pipeline instanceof TRQPTesterPipeline) {
    (state.pipeline as TRQPTesterPipeline).setTRQPEndpoint(endpoint);
  }
  
  res.json({ message: "TRQP endpoint set successfully", endpoint });
});

// Get current TRQP testing configuration
app.get("/api/trqp/config", (req, res) => {
  res.json({
    did: state.trqpDID || "",
    endpoint: state.trqpEndpoint || ""
  });
});

// Verify authorization against TRQP (helper endpoint for testing)
app.post("/api/trqp/verify", async (req, res) => {
  const { entity, action, objects } = req.body;
  
  if (!state.trqpEndpoint) {
    return res.status(400).json({ error: "TRQP endpoint not set" });
  }
  
  if (!entity || !action) {
    return res.status(400).json({ error: "Entity and action are required" });
  }
  
  try {
    // This is a simplified example. In a real implementation, you'd use a proper TRQP client
    const verificationData = {
      entity,
      action,
      objects: objects || []
    };
    
    res.json({
      message: "Verification simulated",
      result: {
        allowed: true,
        entity,
        action,
        objects: objects || []
      }
    });
  } catch (error) {
    console.error("Error verifying authorization:", error);
    res.status(500).json({ error: "Error verifying authorization" });
  }
});

const server = http.createServer(app);

const runServer = () => {
  server.listen(serverPort, () => {
    console.log(`API Server listening at http://localhost:${serverPort}`);
  });
};

export { app, server, runServer };
