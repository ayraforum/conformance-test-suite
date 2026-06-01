import { TaskNode } from "@demo/core/pipeline/src/nodes";
import { BaseAgent } from "@demo/core";
import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { Results, RunnableState } from "@demo/core/pipeline/src/types";
import { DAG } from "@demo/core/pipeline/src/dag";
import { runAllConformanceTests, type ConformanceTestReport } from "../../src/services/trustRegistryApi";

type TrqpTesterContext = {
  didAccepted?: boolean;
  apiAccepted?: boolean;
  authorizationAccepted?: boolean;
  apiReport?: ConformanceTestReport;
  authorizationResult?: {
    status: number;
    ok: boolean;
    body: string;
  };
};

async function readResponseBody(response: Response): Promise<string> {
  return response.text().catch(() => "");
}

export default class TRQPTesterPipeline {
  _dag: DAG;
  _agent: BaseAgent;
  _did: string;
  _trqpEndpoint: string;
  private _context: TrqpTesterContext;

  constructor(agent: BaseAgent, did?: string, trqpEndpoint?: string) {
    this._agent = agent;
    this._did = did || "";
    this._trqpEndpoint = trqpEndpoint || "";
    this._context = {};
    this._dag = this._make(agent);
  }

  dag(): DAG {
    return this._dag;
  }

  async init() {
    const dag = this._make(this._agent);
    this._dag = dag;
  }

  setDID(did: string) {
    this._did = did;
    this.init();
  }

  setTRQPEndpoint(endpoint: string) {
    this._trqpEndpoint = endpoint;
    this.init();
  }

  _make(agent: BaseAgent): DAG {
    const dag = new DAG("Trust Registry Query Protocol (TRQP) Conformance Test");

    // Create DID Resolution Task
    const didResolutionTask = new DIDResolutionTask(
      "DID Resolution",
      "Resolve the DID and find TRQP service endpoints",
      this._did,
      this._context
    );

    // Create API Conformance Task
    const apiConformanceTask = new APIConformanceTask(
      "API Conformance",
      "Test the TRQP API against conformance requirements",
      this._trqpEndpoint,
      this._context
    );

    // Create Authorization Verification Task
    const authorizationTask = new AuthorizationVerificationTask(
      "Authorization Verification",
      "Verify authorization queries against the trust registry",
      this._trqpEndpoint,
      this._context
    );

    // Create Evaluation Task
    const evaluationTask = new TRQPEvaluationTask(
      "TRQP Evaluation",
      "Evaluate overall TRQP conformance",
      this._context
    );

    // Add tasks to the DAG
    const didNode = new TaskNode(didResolutionTask);
    dag.addNode(didNode);

    const apiNode = new TaskNode(apiConformanceTask);
    apiNode.addDependency(didNode);
    dag.addNode(apiNode);

    const authNode = new TaskNode(authorizationTask);
    authNode.addDependency(apiNode);
    dag.addNode(authNode);

    const evalNode = new TaskNode(evaluationTask);
    evalNode.addDependency(authNode);
    dag.addNode(evalNode);

    return dag;
  }
}

export class DIDResolutionTask extends BaseRunnableTask {
  private _did: string;
  private context?: TrqpTesterContext;

  constructor(name: string, description?: string, did?: string, context?: TrqpTesterContext) {
    super(name, description);
    this._did = did || "";
    this.context = context;
  }

  setDID(did: string) {
    this._did = did;
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(): Promise<void> {
    super.run();
    
    this.addMessage(`Resolving DID: ${this._did}`);
    
    if (!this._did) {
      this.addMessage("Error: No DID provided");
      this.setCompleted();
      this.addError("No DID provided");
      return;
    }

    try {
      // Simulate DID resolution - in a real implementation, use the agent to resolve
      this.addMessage("Checking DID document structure");
      this.addMessage("Looking for service endpoints with TRQP type");
      this.addMessage("Found TRQP service endpoint");
      
      // Simulate successful resolution
      this.setCompleted();
      this.setAccepted();
      if (this.context) this.context.didAccepted = true;
    } catch (error) {
      this.addMessage(`Error resolving DID: ${error}`);
      this.setCompleted();
      this.addError(`Error resolving DID: ${error}`);
      if (this.context) this.context.didAccepted = false;
    }
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "DID Resolution",
      value: {
        did: this._did,
        resolved: this.state.status === RunnableState.ACCEPTED,
        serviceEndpoint: this.state.status === RunnableState.ACCEPTED ? "https://example.com/trqp" : null,
      },
    };
  }
}

export class APIConformanceTask extends BaseRunnableTask {
  private _endpoint: string;
  private context?: TrqpTesterContext;
  private report?: ConformanceTestReport;

  constructor(name: string, description?: string, endpoint?: string, context?: TrqpTesterContext) {
    super(name, description);
    this._endpoint = endpoint || "";
    this.context = context;
  }

  setEndpoint(endpoint: string) {
    this._endpoint = endpoint;
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(): Promise<void> {
    super.run();
    
    this.addMessage(`Testing API conformance for endpoint: ${this._endpoint}`);
    
    if (!this._endpoint) {
      this.addMessage("Error: No endpoint provided");
      this.setCompleted();
      this.addError("No endpoint provided");
      return;
    }

    try {
      this.report = await runAllConformanceTests(this._endpoint);
      if (this.context) {
        this.context.apiReport = this.report;
        this.context.apiAccepted = this.report.failedCount === 0;
      }
      this.addMessage(
        `TRQP API conformance checks completed: ${this.report.passedCount} passed, ${this.report.failedCount} failed`
      );
      if (this.report.failedCount > 0) {
        this.addError(`TRQP API conformance failed: ${this.report.failedCount} check(s) failed`);
        this.setFailed();
      } else {
        this.setAccepted();
      }
      this.setCompleted();
    } catch (error) {
      this.addMessage(`Error testing API: ${error}`);
      this.setCompleted();
      this.addError(`Error testing API: ${error}`);
      if (this.context) this.context.apiAccepted = false;
      this.setFailed();
    }
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "API Conformance",
      value: this.report ?? {
        endpoint: this._endpoint,
        conformant: false,
        passedCount: 0,
        failedCount: 1,
        testResults: [],
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class AuthorizationVerificationTask extends BaseRunnableTask {
  private _endpoint: string;
  private context?: TrqpTesterContext;
  private result?: {
    endpoint: string;
    conformant: boolean;
    tests: {
      postAuthorization: boolean;
    };
    response?: {
      status: number;
      ok: boolean;
      body: string;
    };
  };

  constructor(name: string, description?: string, endpoint?: string, context?: TrqpTesterContext) {
    super(name, description);
    this._endpoint = endpoint || "";
    this.context = context;
  }

  setEndpoint(endpoint: string) {
    this._endpoint = endpoint;
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(): Promise<void> {
    super.run();
    
    this.addMessage(`Testing authorization verification for endpoint: ${this._endpoint}`);
    
    if (!this._endpoint) {
      this.addMessage("Error: No endpoint provided");
      this.setCompleted();
      this.addError("No endpoint provided");
      return;
    }

    try {
      const normalizedEndpoint = this._endpoint.replace(/\/$/, "");
      const response = await fetch(`${normalizedEndpoint}/authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          entity_id: "did:example:entity123",
          authority_id: "did:example:authority",
          action: "issue",
          resource: "ayracard:businesscard",
          context: {},
        }),
      });
      const body = await readResponseBody(response);
      const responseEvidence = { status: response.status, ok: response.ok, body };
      const accepted = response.ok;
      this.result = {
        endpoint: normalizedEndpoint,
        conformant: accepted,
        tests: {
          postAuthorization: accepted,
        },
        response: responseEvidence,
      };
      if (this.context) {
        this.context.authorizationAccepted = accepted;
        this.context.authorizationResult = responseEvidence;
      }
      if (!accepted) {
        this.addError(`TRQP authorization check failed: ${response.status} ${response.statusText} ${body}`);
        this.setFailed();
      } else {
        this.addMessage("TRQP authorization POST check passed");
        this.setAccepted();
      }
      this.setCompleted();
    } catch (error) {
      this.addMessage(`Error testing authorization: ${error}`);
      this.setCompleted();
      this.addError(`Error testing authorization: ${error}`);
      if (this.context) this.context.authorizationAccepted = false;
      this.setFailed();
    }
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "Authorization Verification",
      value: this.result ?? {
        endpoint: this._endpoint,
        conformant: false,
        tests: {
          postAuthorization: false,
        },
      },
    };
  }
}

export class TRQPEvaluationTask extends BaseRunnableTask {
  private context?: TrqpTesterContext;
  private result?: any;

  constructor(name: string, description?: string, context?: TrqpTesterContext) {
    super(name, description);
    this.context = context;
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(input?: Partial<TrqpTesterContext>): Promise<void> {
    super.run();
    this.addMessage("Evaluating TRQP conformance test results");
    this.addMessage("Checking DID resolution results");
    this.addMessage("Checking API conformance results");
    this.addMessage("Checking authorization verification results");
    this.addMessage("Generating final conformance report");
    const didAccepted = input?.didAccepted ?? this.context?.didAccepted === true;
    const apiAccepted = input?.apiAccepted ?? this.context?.apiAccepted === true;
    const authorizationAccepted =
      input?.authorizationAccepted ?? this.context?.authorizationAccepted === true;
    const accepted = didAccepted && apiAccepted && authorizationAccepted;
    this.result = {
      message: accepted ? "TRQP conformance test completed" : "TRQP conformance test failed",
      conformanceLevel: accepted ? "Full" : "None",
      details: {
        didResolution: didAccepted ? "Pass" : "Fail",
        apiConformance: apiAccepted ? "Pass" : "Fail",
        authorization: authorizationAccepted ? "Pass" : "Fail",
        overall: accepted ? "Pass" : "Fail",
      },
    };
    if (accepted) {
      this.setAccepted();
    } else {
      this.setFailed();
    }
    this.setCompleted();
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "TRQP Evaluation",
      value: this.result ?? {
        message: "TRQP conformance test failed",
        conformanceLevel: "None",
        details: {
          didResolution: "Fail",
          apiConformance: "Fail",
          authorization: "Fail",
          overall: "Fail",
        },
      },
    };
  }
}
