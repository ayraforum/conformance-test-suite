import { DAG } from "@demo/core/pipeline/src/dag";
import { BaseAgent, AgentConfiguration, AgentController } from "@demo/core";
import {
  HolderTestPipeline,
  VerifierTestPipeline,
  VerifierAcaPyPipeline,
  RegistryTestPipeline,
  IssueCredentialPipeline,
} from "./pipelines";
import { PipelineType } from "./pipelines";
import { AcaPyAgentAdapter } from "@demo/core";

export type Pipeline = {
  init(): Promise<void>;
  dag(): DAG;
};

export type State = {
  dag?: DAG;
  config?: AgentConfiguration;
  pipeline?: Pipeline;
  currentInvitation?: string;
  agent?: BaseAgent;
  controller?: AgentController;
  issuerController?: AgentController;
  issuerAgentType?: "credo" | "acapy";
  credentialFormat?: "anoncreds" | "w3c";
  verifyTRQP?: boolean;
  verifierController?: AgentController;
};

const _state: State = {};

const normalizeEnvValue = (value?: string): string => (value ?? "").split("#")[0].trim();
const normalizeEnvChoice = (value: string | undefined, fallback: string): string =>
  normalizeEnvValue(value || fallback).split(/\s+/)[0].toLowerCase();

// Default credential format based on runtime mode. When running with ACA-Py demo/reference
// agents, default to W3C to avoid accidentally triggering AnonCreds issuance paths.
if (!_state.credentialFormat) {
  const referenceAgent = normalizeEnvChoice(process.env.REFERENCE_AGENT, "credo");
  _state.credentialFormat = referenceAgent === "acapy" ? "w3c" : "anoncreds";
}

export const setDAG = (dag: DAG) => {
  _state.dag = dag;
};

export const setPipeline = (pipeline: Pipeline) => {
  console.log("[STATE] Setting pipeline:", pipeline?.constructor?.name);
  _state.pipeline = pipeline;
};

export const setAgent = (agent: BaseAgent) => {
  _state.agent = agent;
};

export const setController = (controller: AgentController) => {
  _state.controller = controller;
};
export const setIssuerController = (controller?: AgentController) => {
  _state.issuerController = controller;
};
export const setVerifierController = (controller?: AgentController) => {
  _state.verifierController = controller;
};

export const setIssuerAgentType = (
  type?: "credo" | "acapy"
): void => {
  _state.issuerAgentType = type;
};

export const setCredentialFormat = (
  format: "anoncreds" | "w3c"
): void => {
  _state.credentialFormat = format;
};

export const setConfig = (config: AgentConfiguration) => {
  _state.config = config;
};

export const setVerifyTRQP = (flag?: boolean) => {
  _state.verifyTRQP = flag;
};

export { _state as state };

export const selectPipeline = (type: PipelineType): Pipeline => {
  console.log("[STATE] Selecting pipeline type:", type);
  var pipe: Pipeline;
  switch (type) {
    case PipelineType.HOLDER_TEST:
      if (!_state.controller) {
        throw new Error("agent controller not defined");
      }
      pipe = new HolderTestPipeline(
        _state.controller,
        _state.verifyTRQP ?? false
      );
      break;
    case PipelineType.ISSUER_TEST:
      const issuerController = _state.issuerController ?? _state.controller;
      if (!issuerController) {
        throw new Error("agent controller not defined");
      }
      {
        const referenceAgent = normalizeEnvChoice(process.env.REFERENCE_AGENT, "credo");
        const allowAcaPyAnonCreds =
          normalizeEnvChoice(process.env.ALLOW_ACAPY_ANONCREDS, "false") === "true";
        const issuerAdapter = issuerController.getAdapter?.();
        const issuerAdapterType =
          issuerAdapter && issuerAdapter.constructor
            ? issuerAdapter.constructor.name
            : typeof issuerAdapter;
        const isAcaPyIssuerAdapter =
          !!issuerAdapter &&
          (issuerAdapter instanceof AcaPyAgentAdapter ||
            issuerAdapterType === "AcaPyAgentAdapter");

        // In ACA-Py demo/reference mode we default to W3C and *disallow* AnonCreds unless explicitly enabled.
        // This avoids confusing failures like:
        //   "AnonCreds interface requires AskarAnonCreds or KanonAnonCreds profile"
        if (referenceAgent === "acapy" && !allowAcaPyAnonCreds) {
          if (!isAcaPyIssuerAdapter) {
            throw new Error(
              `[STATE] ACA-Py mode requires an ACA-Py issuer controller for W3C issuance, but issuer adapter is ${issuerAdapterType}`
            );
          }
          const { IssueAcaPyW3CPipeline } = require("./pipelines");
          pipe = new IssueAcaPyW3CPipeline(issuerController);
          break;
        }

        // In ACA-Py demo/reference mode we do not support AnonCreds by default (it requires an
        // AskarAnonCreds/KanonAnonCreds profile). To avoid confusing "sometimes AnonCreds" failures,
        // force W3C unless the operator explicitly opts into AnonCreds.
        const effectiveIssuerType =
          _state.issuerAgentType ?? (referenceAgent === "acapy" ? "acapy" : "credo");
        const shouldUseW3c =
          effectiveIssuerType === "acapy" &&
          isAcaPyIssuerAdapter &&
          (_state.credentialFormat === "w3c" || (referenceAgent === "acapy" && !allowAcaPyAnonCreds));

        console.log(
          `[STATE] Issuer selection: issuerAgentType=${_state.issuerAgentType ?? "unset"} effectiveIssuerType=${effectiveIssuerType} issuerAdapter=${issuerAdapterType} credentialFormat=${_state.credentialFormat} referenceAgent=${referenceAgent} allowAcaPyAnonCreds=${allowAcaPyAnonCreds} -> ${shouldUseW3c ? "w3c" : "anoncreds"}`
        );

        if (shouldUseW3c) {
          const { IssueAcaPyW3CPipeline } = require("./pipelines");
          pipe = new IssueAcaPyW3CPipeline(issuerController);
        } else {
          if (referenceAgent === "acapy" && effectiveIssuerType === "acapy" && !allowAcaPyAnonCreds) {
            console.warn(
              "[STATE] Selecting AnonCreds issuance while in ACA-Py mode without ALLOW_ACAPY_ANONCREDS=true; issuance will likely fail."
            );
          }
          if (_state.credentialFormat === "w3c" && !isAcaPyIssuerAdapter) {
            console.warn(
              `[STATE] W3C card format selected but issuer adapter is not ACA-Py (${issuerAdapterType}); falling back to AnonCreds issuance pipeline.`
            );
          }
          pipe = new IssueCredentialPipeline(issuerController);
        }
      }
      break;
    case PipelineType.VERIFIER_TEST:
      {
        const referenceAgent = normalizeEnvChoice(process.env.REFERENCE_AGENT, "credo");
        const adapter = _state.controller?.getAdapter?.();
        const adapterType =
          adapter && (adapter as any).constructor ? (adapter as any).constructor.name : typeof adapter;
        const isAcaPyAdapter =
          !!adapter &&
          (adapter instanceof AcaPyAgentAdapter || adapterType === "AcaPyAgentAdapter");
        if (referenceAgent === "acapy" && isAcaPyAdapter) {
          if (!_state.controller) {
            throw new Error("agent controller not defined");
          }
          // In demo mode we can optionally use an internal ACA-Py verifier controller to auto-send the proof request.
          pipe = new VerifierAcaPyPipeline(_state.controller, undefined, _state.verifierController);
          break;
        }
        if (!_state.agent) {
          throw new Error("agent not defined");
        }
        pipe = new VerifierTestPipeline(_state.agent);
      }
      break;
    case PipelineType.REGISTRY_TEST:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new RegistryTestPipeline(_state.agent);
      break;
    default:
      throw new Error(`could not find pipeline type ${type}`);
  }
  setPipeline(pipe);
  setDAG(pipe.dag());
  return pipe;
};
