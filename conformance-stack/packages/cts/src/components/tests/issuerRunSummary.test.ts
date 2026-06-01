import { summarizeIssuerDag } from "./issuerRunSummary";

const node = (name: string, status: string, runState = "completed") => ({
  id: name,
  name,
  description: "",
  state: runState,
  finished: true,
  stopped: false,
  task: {
    id: name,
    metadata: { name, id: name, description: "" },
    state: {
      status,
      runState,
      warnings: [],
      messages: [],
      errors: status === "Failed" ? ["connection not ready"] : [],
    },
  },
});

describe("summarizeIssuerDag", () => {
  test("reports failure when issuance node failed even if the DAG run completed", () => {
    const summary = summarizeIssuerDag({
      status: { status: "Started", runState: "completed" },
      metadata: { name: "Issuer", id: "issuer" },
      nodes: [node("Scan To Connect", "Accepted"), node("Issue Ayra Business Card", "Failed")],
    });

    expect(summary.success).toBe(false);
    expect(summary.issuanceStatus).toBe("failed");
    expect(summary.message).toContain("did not complete");
  });

  test("reports success only when all issuer DAG nodes passed", () => {
    const summary = summarizeIssuerDag({
      status: { status: "Started", runState: "completed" },
      metadata: { name: "Issuer", id: "issuer" },
      nodes: [node("Scan To Connect", "Accepted"), node("Issue Ayra Business Card", "Accepted")],
    });

    expect(summary.success).toBe(true);
    expect(summary.issuanceStatus).toBe("passed");
  });
});
