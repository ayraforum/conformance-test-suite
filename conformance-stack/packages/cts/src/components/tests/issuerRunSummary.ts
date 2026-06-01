import type { TestStepStatus } from "@/components/TestRunner";

type IssuerTaskNode = {
  task?: {
    state?: {
      status?: string;
      runState?: string;
      errors?: string[];
    };
  };
};

type IssuerDagData = {
  status?: {
    status?: string;
    runState?: string;
  };
  metadata?: unknown;
  nodes?: IssuerTaskNode[];
} | null;

export type IssuerRunSummary = {
  success: boolean;
  connectionStatus: TestStepStatus;
  issuanceStatus: TestStepStatus;
  reportStatus: TestStepStatus;
  title: string;
  message: string;
  error?: string;
};

const isFailedNode = (node: IssuerTaskNode): boolean => {
  const status = (node.task?.state?.status || "").toLowerCase();
  const runState = (node.task?.state?.runState || "").toLowerCase();
  return status === "failed" || status === "error" || runState === "failed" || runState === "error";
};

const isPassedNode = (node: IssuerTaskNode): boolean => {
  const status = (node.task?.state?.status || "").toLowerCase();
  return status === "accepted" || status === "passed";
};

export function summarizeIssuerDag(dagData: IssuerDagData): IssuerRunSummary {
  const nodes = dagData?.nodes || [];
  const failedNode = nodes.find(isFailedNode);
  const allNodesPassed = nodes.length > 0 && nodes.every(isPassedNode);
  const dagCompleted = (dagData?.status?.runState || "").toLowerCase() === "completed";

  if (failedNode) {
    return {
      success: false,
      connectionStatus: isPassedNode(nodes[0]) ? "passed" : "failed",
      issuanceStatus: "failed",
      reportStatus: "failed",
      title: "Test Failed",
      message: "Your issuer did not complete the conformance test.",
      error: failedNode.task?.state?.errors?.[0],
    };
  }

  if (dagCompleted && allNodesPassed) {
    return {
      success: true,
      connectionStatus: "passed",
      issuanceStatus: "passed",
      reportStatus: "passed",
      title: "Test Complete!",
      message: "Your issuer has successfully completed the conformance test.",
    };
  }

  return {
    success: false,
    connectionStatus: isPassedNode(nodes[0]) ? "passed" : "pending",
    issuanceStatus: isPassedNode(nodes[1]) ? "passed" : "pending",
    reportStatus: "pending",
    title: "Test Incomplete",
    message: "The issuer conformance test has not completed yet.",
  };
}
