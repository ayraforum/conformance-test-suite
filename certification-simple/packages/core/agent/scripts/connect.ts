import { SetupConnectionTask } from "../tasks";
import { createAgentConfig } from "../utils";
import ngrok from "ngrok";

import { v4 } from "uuid";
import { BaseAgent } from "../core";
const agentId = v4();
const port: number = Number(process.env.PORT) || 3033;

const run = async () => {
  const ngrokUrl = await ngrok.connect({
    addr: port,
    proto: "http",
    authtoken: "2RmkCPC2twjpR4AxhxPwksLWBZh_6DMgZzSgqf9qgxRYKMEy1", // process.env.NGROK_AUTH_TOKEN, // If you have an ngrok account
  });
  const config = createAgentConfig("Agent", port, agentId, ngrokUrl, [
    ngrokUrl,
  ]);
  const agent = new BaseAgent(config);
  await agent.init();
  const task = new SetupConnectionTask(agent, "Setup Agent Example");
  await task.prepare();
  console.log("prepared");
  await task.run();
  console.log("run");
};

// Execute the function and keep the script running until it completes
run()
  .then(() => {
    console.log("All jobs finished successfully.");
    process.exit(0); // Exit the process when done
  })
  .catch((err) => {
    console.error("An error occurred during execution:", err);
    process.exit(1); // Exit with an error code if something failed
  });
