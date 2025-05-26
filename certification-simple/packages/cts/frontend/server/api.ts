import express from "express";
import cors from "cors";
import { state } from "./state";
import http from "http";
import { run } from "./server";
import { selectPipeline, PipelineType } from "./state";
import { Express } from "express";

const serverPort: number = Number(process.env.SERVER_PORT) || 3001; 
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/dag", (req, res) => {
  res.json({ dag: state?.dag?.serialize() });
});

app.get("/api/run", (req, res) => {
  // Send response immediately
  res.json({ message: "Pipeline kickoff initiated" });

  state.currentInvitation = "";
  // Run the pipeline asynchronously in the background
  (async () => {
    try {
      await run();
      console.log("Pipeline execution completed");
    } catch (error) {
      console.error("Error during pipeline execution:", error);
    }
  })();
});

app.get("/api/select/pipeline", (req, res) => {
  const pipelineName = req.query.pipeline as string;
  console.log("Selecting pipeline", pipelineName);
  selectPipeline(pipelineName as PipelineType);
  res.json({ message: "Pipeline selected" });
});

app.get("/api/invitation", (req, res) => {
  res.json({ invite: state?.currentInvitation });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    agent: state.agent ? "initialized" : "not initialized",
    pipeline: state.pipeline ? "loaded" : "not loaded"
  });
});

const server = http.createServer(app);

const runServer = () => {
  server.listen(serverPort, () => {
    console.log(`CTS API Server listening at http://localhost:${serverPort}`);
  });
};

export { app, server, runServer };
