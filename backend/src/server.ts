import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { exec } from "child_process";
import cors from "cors";
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(cors());
app.use(express.json());

const aathPath = process.env.AATH_PATH ? process.env.AATH_PATH : "/home/davidpoltorak-io/Projects/gan-aath/";
const command = `${aathPath}/manage`;
const args: string[] = [
  "run",
  "-d",
  "acapy",
  "-t", "@RFC0023,@RFC0453,@RFC0454,@CredFormat_JSON-LD,@DidMethod_key,@ProofType_Ed25519Signature2018",
  "-t", "~@Anoncreds",
  "-t", "@critical",
  "-t", "~@RFC0793",
  "-t", "~@RFC0434",
  "-t", "~@DidMethod_orb",
  "-t", "~@DidMethod_sov",
  "-t", "~@ProofType_BbsBls12381G2PubKey"
];

// Add this interface near the top of the file
interface ExecuteProfile {
  systemName: string;
  systemVersion: string;
  systemEndpoint: string;
  runId: string;
}

// Add these interfaces
interface TestResult {
  profile: string;
  feature_name: string;
  scenario_name: string;
  status: string;
  tags: string[];
}

interface ConformanceResult {
  profileResults: {
    profileName: string;
    passedTests: TestResult[];
    failedTests: TestResult[];
  }[];
  conformantProfiles: string[];
  isConformant: boolean;
}

// Store running processes by ID
const processes: Record<string, { process: any; room: string }> = {};

/**
 * Function to run a command and stream its logs.
 */
function runCommandWithLogs(command: string, args: string[], id: string): void {
  const room = `logs-${id}`;
  const fullCommand = `bash ${command} ${args.join(" ")}`;
  console.log(`Running command: ${fullCommand}`);
  const childProcess = exec(fullCommand, {
    cwd: aathPath,
    env: { ...process.env, NO_TTY: '1', BEHAVE_REPORT_FILENAME: `${id}.json` }
  });

  if (!childProcess.stdout || !childProcess.stderr) {
    throw new Error('Failed to start process streams');
  }

  // Store the process in the global map
  processes[id] = { process: childProcess, room };

  // Stream stdout logs
  childProcess.stdout.on("data", (data) => {
    io.to(room).emit("log", { type: "stdout", message: data.toString() });
  });

  // Stream stderr logs
  childProcess.stderr.on("data", (data) => {
    io.to(room).emit("log", { type: "stderr", message: data.toString() });
  });

  // Handle process completion
  childProcess.on("close", (code) => {
    const statusMessage = `Process exited with code ${code}`;
    io.to(room).emit("log", { type: "status", message: statusMessage });
    io.to(room).emit("log-complete");
    delete processes[id]; // Remove process from map after completion
  });

  // Handle errors
  childProcess.on("error", (error) => {
    io.to(room).emit("log", { type: "error", message: error.message });
    delete processes[id]; // Remove process from map on error
  });
}

// Add this function to check test results
function checkTests(data: any[], profileName: string): TestResult[] {
  const testResults: TestResult[] = [];

  for (const feature of data) {
    const featureName = feature.name || 'Unknown Feature';
    for (const element of feature.elements || []) {
      if (element.type === 'scenario') {
        testResults.push({
          profile: profileName,
          feature_name: featureName,
          scenario_name: element.name,
          status: element.status,
          tags: element.tags || []
        });
      }
    }
  }

  return testResults;
}

// API Route: Start a command
app.post("/execute-profile", (req, res) => {
  const data = req.body as ExecuteProfile;

  if (!('systemName' in data) || !('systemVersion' in data) || !('systemEndpoint' in data) || !('runId' in data)) {
    res.status(400).json({
      error: "Missing required fields. Please provide systemName, systemVersion, systemEndpoint, and runId."
    });
    return;
  }

  if (processes[data.runId]) {
    res.status(400).json({ error: `A process with ID ${data.runId} is already running.` });
    return;
  }

  try {
    console.log(`Running command: ${command} ${args.join(" ")}`);
    runCommandWithLogs(command, args || [], data.runId);
    res.status(200).json({ message: "Command started" });
  } catch (error) {
    console.error("Error starting command:", error);
    res.status(500).json({ error: "Failed to start command" });
  }
});

// WebSocket: Handle log streaming via rooms
io.on("connection", (socket) => {
  console.log("WebSocket client connected");

  // Handle joining a room
  socket.on("join-room", (room) => {
    console.log(`Client joined room: ${room}`);
    socket.join(room);
  });

  // Handle leaving a room
  socket.on("leave-room", (room) => {
    console.log(`Client left room: ${room}`);
    socket.leave(room);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("WebSocket client disconnected");
  });
});

// Add new endpoint to process test results
app.get("/check-conformance/:runId", (req, res) => {
  const { runId } = req.params;
  const jsonOutputPath = path.join(aathPath, '.logs', `${runId}.json`);

  try {
    // Check if the file exists
    if (!fs.existsSync(jsonOutputPath)) {
      res.status(404).json({ error: "Test results file not found" });
      return;
    }

    // Read and parse the JSON file
    const data = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf-8'));

    // Process the results
    const testResults = checkTests(data, "default-profile"); // You might want to make profile name configurable

    const passedTests = testResults.filter(test => test.status === 'passed');
    const failedTests = testResults.filter(test => test.status !== 'passed');

    const conformanceResult: ConformanceResult = {
      profileResults: [{
        profileName: "default-profile",
        passedTests,
        failedTests
      }],
      conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
      isConformant: failedTests.length === 0
    };

    res.status(200).json(conformanceResult);
  } catch (error) {
    console.error("Error processing test results:", error);
    res.status(500).json({ error: "Failed to process test results" });
  }
});

// Start the server
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
