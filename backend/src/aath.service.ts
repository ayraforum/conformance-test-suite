import { exec } from "child_process";

function runScript(command: string, args: string[] = []) {
  return new Promise((resolve, reject) => {
    const fullCommand = `./manage ${command} ${args.join(" ")}`;
    const child = exec(fullCommand);

    if (child.stdout && child.stderr) {
      // Stream stdout
      child.stdout.on("data", (data) => {
        console.log(`STDOUT: ${data.toString()}`);
      });

      // Stream stderr
      child.stderr.on("data", (data) => {
        console.error(`STDERR: ${data.toString()}`);
      });
    }

    // Handle process completion
    child.on("close", (code) => {
      if (code === 0) {
        resolve(`Process completed with code ${code}`);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    // Handle errors
    child.on("error", (error) => {
      reject(error);
    });
  });
}

// Async function to call runScript
async function startHarness() {
  try {
    console.log("Starting harness...");
    const output = await runScript("start", ["-d acapy"]);
    console.log("Process completed successfully:", output);
  } catch (err) {
    console.error("Error during execution:", err);
  }
}

// Call the async function
startHarness();
