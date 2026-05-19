import { spawnSync } from "child_process";

import {
  buildCtsRunnerPlan,
  ctsManifest,
  listCtsStandards,
  validateCtsManifest,
  type CtsRole,
  type CtsRunnerPlanFilters,
  type TestPolarity,
} from "../server/manifest";

const validRoles: CtsRole[] = [
  "holder",
  "issuer",
  "verifier",
  "trust-registry",
];
const validPolarities: TestPolarity[] = ["positive", "negative"];

const usage = `Usage:
  pnpm run list:cts-standards
  pnpm run plan:cts-runner -- [--standard <name>] [--role <role>] [--polarity <positive|negative>] [--json]
  pnpm run run:cts-standard -- --standard <name> --run

By default this prints a deterministic runner plan without invoking live agents.
Pass --run to execute runnable commands. Test cases with pendingReason are reported but not executed.`;

const requireValue = (args: string[], index: number, flag: string): string => {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
};

const parseArgs = (args: string[]) => {
  const filters: CtsRunnerPlanFilters = {};
  let listStandards = false;
  let run = false;
  let json = false;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--standard") {
      filters.standard = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--role") {
      const role = requireValue(args, index, arg) as CtsRole;
      if (!validRoles.includes(role)) {
        throw new Error(`--role must be one of ${validRoles.join(", ")}`);
      }
      filters.role = role;
      index += 1;
    } else if (arg === "--polarity") {
      const polarity = requireValue(args, index, arg) as TestPolarity;
      if (!validPolarities.includes(polarity)) {
        throw new Error(
          `--polarity must be one of ${validPolarities.join(", ")}`
        );
      }
      filters.polarity = polarity;
      index += 1;
    } else if (arg === "--list-standards") {
      listStandards = true;
    } else if (arg === "--run") {
      run = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { filters, help, json, listStandards, run };
};

const printPlan = (filters: CtsRunnerPlanFilters) => {
  const plan = buildCtsRunnerPlan(ctsManifest, filters);
  const filterSummary = Object.keys(filters).length
    ? JSON.stringify(filters)
    : "all manifest cases";

  console.log(`CTS runner plan for ${filterSummary}`);
  console.log(`Runnable test cases: ${plan.runnable.length}`);
  plan.runnable.forEach((testCase) => {
    console.log(`- ${testCase.testCaseId}: ${testCase.title}`);
    testCase.commands.forEach((command) => console.log(`  $ ${command}`));
  });

  console.log(`Pending test cases: ${plan.pending.length}`);
  plan.pending.forEach((testCase) => {
    console.log(`- ${testCase.testCaseId}: ${testCase.title}`);
    console.log(`  pending: ${testCase.pendingReason}`);
  });

  return plan;
};

const main = () => {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    console.log(usage);
    return;
  }

  if (parsed.listStandards) {
    listCtsStandards(ctsManifest).forEach((standard) => console.log(standard));
    return;
  }

  const validationErrors = validateCtsManifest(ctsManifest);
  if (validationErrors.length > 0) {
    console.error("CTS manifest is invalid:");
    validationErrors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  const plan = buildCtsRunnerPlan(ctsManifest, parsed.filters);
  if (parsed.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    printPlan(parsed.filters);
  }

  if (!parsed.run) {
    return;
  }

  if (plan.runnable.length === 0) {
    console.error("No runnable CTS test cases matched the selected filters.");
    process.exitCode = 1;
    return;
  }

  for (const testCase of plan.runnable) {
    for (const command of testCase.commands) {
      console.log(`\nRunning ${testCase.testCaseId}: ${command}`);
      const result = spawnSync(command, {
        cwd: process.cwd(),
        shell: true,
        stdio: "inherit",
      });

      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        return;
      }
    }
  }
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage);
  process.exitCode = 1;
}
