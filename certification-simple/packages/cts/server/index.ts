import { Server } from "socket.io";
import { createServer } from "http";
import { BaseAgent, createAgentConfig } from "@demo/core";
import { v4 as uuidv4 } from "uuid";
import VerifierTestPipeline from "./pipelines/verifierTestPipeline";
import IssueCredentialPipeline from "./pipelines/issueCredentialPipeline";
import { TaskRunnerNode } from "@demo/core/pipeline/src/types";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const agentId = uuidv4();
const agentPort = Number(process.env.AGENT_PORT) || 3001;
const baseUrl = process.env.BASE_URL || "http://localhost:3001";
function deriveAgentLabel() {
  const referenceAgent = (process.env.REFERENCE_AGENT || "credo").toLowerCase();
  const agentType = referenceAgent === "acapy" ? "ACA-Py" : "Credo";
  return `Ayra CTS Reference ${agentType} Agent`;
}

const agentLabel = deriveAgentLabel();

// Initialize the server asynchronously
async function initializeServer() {
  try {
    const config = createAgentConfig(agentLabel, agentPort, agentId, baseUrl, [baseUrl]);
    const agent = new BaseAgent(config);
    await agent.init();

    const verifierPipeline = new VerifierTestPipeline(agent);
    const issuerPipeline = new IssueCredentialPipeline(agent);

    io.on("connection", (socket) => {
      console.log("Client connected");

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });

      socket.on("startVerifierTest", async () => {
        try {
          const dag = verifierPipeline.dag();
          const nodes = dag.getNodes();
          const connectionNode = nodes.find((node: TaskRunnerNode) => node.task.metadata.name === "Setup Connection");
          if (!connectionNode) {
            throw new Error("Connection node not found");
          }

          await connectionNode.init();
          await connectionNode.run();
          const results = await connectionNode.task.results();
          const invitationUrl = results?.value?.invitationUrl;
          if (!invitationUrl) {
            throw new Error("No invitation URL generated");
          }

          socket.emit("invitationUrl", { url: invitationUrl });
        } catch (error) {
          console.error("Connection error:", error);
          socket.emit("connectionError", {
            message: error instanceof Error ? error.message : "Connection failed",
          });
        }
      });

      socket.on("startConnection", async () => {
        try {
          const dag = issuerPipeline.dag();
          const nodes = dag.getNodes();
          const connectionNode = nodes.find((node: TaskRunnerNode) => node.task.metadata.name === "Setup Connection");
          if (!connectionNode) {
            throw new Error("Connection node not found");
          }

          await connectionNode.init();
          await connectionNode.run();
          const results = await connectionNode.task.results();
          const invitationUrl = results?.value?.invitationUrl;
          if (!invitationUrl) {
            throw new Error("No invitation URL generated");
          }

          socket.emit("invitationUrl", { url: invitationUrl });
        } catch (error) {
          console.error("Connection error:", error);
          socket.emit("connectionError", {
            message: error instanceof Error ? error.message : "Connection failed",
          });
        }
      });

      socket.on("issueCredential", async () => {
        try {
          const dag = issuerPipeline.dag();
          const nodes = dag.getNodes();
          const credentialNode = nodes.find((node: TaskRunnerNode) => node.task.metadata.name === "Issue Credential");
          if (!credentialNode) {
            throw new Error("Credential node not found");
          }

          await credentialNode.init();
          await credentialNode.run();
          const results = await credentialNode.task.results();
          if (!results) {
            throw new Error("No credential result");
          }

          socket.emit("credentialStatus", { status: "issued" });
        } catch (error) {
          console.error("Credential error:", error);
          socket.emit("credentialError", {
            message: error instanceof Error ? error.message : "Credential issuance failed",
          });
        }
      });
    });

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Start the server
initializeServer(); 
