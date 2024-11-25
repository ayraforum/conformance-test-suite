import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { ExecuteProfile, ConformanceResult, TestResult } from "../models/testModel";
import { processes, streamLogs } from "./logService";
import { AATH_PATH, DEFAULT_ARGS } from "../config/constants";

export class TestService {
  private command = `${AATH_PATH}/manage`;

  public async executeProfile(data: ExecuteProfile): Promise<void> {
    if (processes[data.runId]) {
      throw new Error(`A process with ID ${data.runId} is already running.`);
    }

    const room = `logs-${data.runId}`;
    const fullCommand = `bash ${this.command} ${DEFAULT_ARGS.join(" ")}`;

    try {
      const childProcess = exec(fullCommand, {
        cwd: AATH_PATH,
        env: { ...process.env, NO_TTY: "1", BEHAVE_REPORT_FILENAME: `${data.runId}.json` },
      });

      if (!childProcess.stdout || !childProcess.stderr) {
        throw new Error("Failed to start process streams");
      }

      streamLogs(childProcess, room, data.runId);
    } catch (error) {
      console.error("Error starting command:", error);
      throw new Error("Failed to start command");
    }
  }

  public async checkConformance(runId: string): Promise<ConformanceResult> {
    const jsonOutputPath = path.join(AATH_PATH, ".logs", `${runId}.json`);

    if (!fs.existsSync(jsonOutputPath)) {
      throw new Error("Test results file not found");
    }

    try {
      const data = JSON.parse(fs.readFileSync(jsonOutputPath, "utf-8"));
      const testResults = this.checkTests(data, "default-profile");

      const passedTests = testResults.filter((test) => test.status === "passed");
      const failedTests = testResults.filter((test) => test.status !== "passed");

      return {
        profileResults: [
          {
            profileName: "default-profile",
            passedTests,
            failedTests,
          },
        ],
        conformantProfiles: failedTests.length === 0 ? ["default-profile"] : [],
        isConformant: failedTests.length === 0,
      };
    } catch (error) {
      console.error("Error processing test results:", error);
      throw new Error("Failed to process test results");
    }
  }

  private checkTests(data: any[], profileName: string): TestResult[] {
    const testResults: TestResult[] = [];

    for (const feature of data) {
      const featureName = feature.name || "Unknown Feature";
      for (const element of feature.elements || []) {
        if (element.type === "scenario") {
          testResults.push({
            profile: profileName,
            feature_name: featureName,
            scenario_name: element.name,
            status: element.status,
            tags: element.tags || [],
          });
        }
      }
    }

    return testResults;
  }
}
