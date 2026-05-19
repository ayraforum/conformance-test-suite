export type NormativeLevel = "MUST" | "SHOULD" | "MAY";
export type CtsRole = "holder" | "issuer" | "verifier" | "trust-registry";
export type TestPolarity = "positive" | "negative";

export interface CtsCriterion {
  id: string;
  title: string;
  standard: string;
  version: string;
  profile: string;
  role: CtsRole;
  level: NormativeLevel;
  statement: string;
}

export interface CtsOracle {
  summary: string;
  successCondition?: string;
  failureReason?: string;
  expectedEvidence: string[];
}

export interface CtsRunner {
  commands?: string[];
  pendingReason?: string;
}

export interface CtsTestCase {
  id: string;
  title: string;
  polarity: TestPolarity;
  criterionRefs: string[];
  oracle: CtsOracle;
  evidence: string[];
  runner: CtsRunner;
}

export interface CtsManifest {
  manifestVersion: string;
  profileId: string;
  profileVersion: string;
  criteria: CtsCriterion[];
  testCases: CtsTestCase[];
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasTextArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(hasText);

const validRoles: CtsRole[] = [
  "holder",
  "issuer",
  "verifier",
  "trust-registry",
];
const validLevels: NormativeLevel[] = ["MUST", "SHOULD", "MAY"];
const validPolarities: TestPolarity[] = ["positive", "negative"];

const isOneOf = <T extends string>(value: unknown, allowed: T[]): value is T =>
  typeof value === "string" && allowed.includes(value as T);

export const validateCtsManifest = (manifest: CtsManifest): string[] => {
  const errors: string[] = [];

  if (!hasText(manifest.manifestVersion)) {
    errors.push("manifestVersion is required");
  }
  if (!hasText(manifest.profileId)) {
    errors.push("profileId is required");
  }
  if (!hasText(manifest.profileVersion)) {
    errors.push("profileVersion is required");
  }

  if (!Array.isArray(manifest.criteria) || manifest.criteria.length === 0) {
    errors.push("criteria must list at least one criterion");
  }

  const criterionIds = new Set<string>();
  const referencedCriterionIds = new Set<string>();
  manifest.criteria?.forEach((criterion, index) => {
    if (!hasText(criterion.id)) {
      errors.push(`criteria[${index}].id is required`);
      return;
    }

    if (criterionIds.has(criterion.id)) {
      errors.push(`criteria[${index}].id duplicates ${criterion.id}`);
    }
    criterionIds.add(criterion.id);

    if (!hasText(criterion.title)) {
      errors.push(`criteria[${index}].title is required`);
    }
    if (!hasText(criterion.standard)) {
      errors.push(`criteria[${index}].standard is required`);
    }
    if (!hasText(criterion.version)) {
      errors.push(`criteria[${index}].version is required`);
    }
    if (!hasText(criterion.profile)) {
      errors.push(`criteria[${index}].profile is required`);
    }
    if (!isOneOf(criterion.role, validRoles)) {
      errors.push(
        `criteria[${index}].role must be one of ${validRoles.join(", ")}`
      );
    }
    if (!isOneOf(criterion.level, validLevels)) {
      errors.push(
        `criteria[${index}].level must be one of ${validLevels.join(", ")}`
      );
    }
    if (!hasText(criterion.statement)) {
      errors.push(`criteria[${index}].statement is required`);
    }
  });

  if (!Array.isArray(manifest.testCases) || manifest.testCases.length === 0) {
    errors.push("testCases must list at least one test case");
  }

  const testCaseIds = new Set<string>();
  manifest.testCases?.forEach((testCase, index) => {
    if (!hasText(testCase.id)) {
      errors.push(`testCases[${index}].id is required`);
    } else {
      if (testCaseIds.has(testCase.id)) {
        errors.push(`testCases[${index}].id duplicates ${testCase.id}`);
      }
      testCaseIds.add(testCase.id);
    }

    if (!hasText(testCase.title)) {
      errors.push(`testCases[${index}].title is required`);
    }

    if (!isOneOf(testCase.polarity, validPolarities)) {
      errors.push(
        `testCases[${index}].polarity must be one of ${validPolarities.join(
          ", "
        )}`
      );
    }

    const refs = testCase.criterionRefs;
    if (!hasTextArray(refs) || refs.some((ref) => !criterionIds.has(ref))) {
      errors.push(
        `testCases[${index}].criterionRefs must reference at least one known criterion`
      );
    } else {
      refs.forEach((ref) => referencedCriterionIds.add(ref));
    }

    if (!testCase.oracle) {
      errors.push(`testCases[${index}].oracle is required`);
    } else {
      if (!hasText(testCase.oracle.summary)) {
        errors.push(`testCases[${index}].oracle.summary is required`);
      }
      if (!hasTextArray(testCase.oracle.expectedEvidence)) {
        errors.push(
          `testCases[${index}].oracle.expectedEvidence must list at least one artifact`
        );
      }
      if (
        testCase.polarity === "positive" &&
        !hasText(testCase.oracle.successCondition)
      ) {
        errors.push(
          `testCases[${index}].oracle.successCondition is required for positive tests`
        );
      }
      if (
        testCase.polarity === "negative" &&
        !hasText(testCase.oracle.failureReason)
      ) {
        errors.push(
          `testCases[${index}].oracle.failureReason is required for negative tests`
        );
      }
    }

    if (!hasTextArray(testCase.evidence)) {
      errors.push(
        `testCases[${index}].evidence must list at least one artifact`
      );
    }

    const commands = testCase.runner?.commands;
    const pendingReason = testCase.runner?.pendingReason;
    if (!hasTextArray(commands) && !hasText(pendingReason)) {
      errors.push(
        `testCases[${index}].runner must include commands or pendingReason`
      );
    }
  });

  manifest.criteria?.forEach((criterion, index) => {
    if (hasText(criterion.id) && !referencedCriterionIds.has(criterion.id)) {
      errors.push(
        `criteria[${index}].id ${criterion.id} must be referenced by at least one test case`
      );
    }
  });

  return errors;
};

export const ctsManifest: CtsManifest = {
  manifestVersion: "0.1.0",
  profileId: "ayra-didcomm-w3c-ldp-trqp",
  profileVersion: "2026-05-draft",
  criteria: [
    {
      id: "AYRA-PP20-VERIFY-TRUE",
      title: "Verifier success requires explicit proof verification",
      standard: "Aries RFC 0454 Present Proof v2",
      version: "AIP 2.0",
      profile: "Ayra DIDComm W3C LDP + TRQP draft",
      role: "verifier",
      level: "MUST",
      statement:
        "A positive verifier conformance run only passes after the proof record reports verified === true; protocol state done is not sufficient on its own.",
    },
    {
      id: "AYRA-TRQP-AUTHZ-RECOGNITION",
      title: "TRQP checks are observable when enabled",
      standard: "Trust Registry Query Protocol",
      version: "2.0",
      profile: "Ayra DIDComm W3C LDP + TRQP draft",
      role: "verifier",
      level: "MUST",
      statement:
        "When a verifier run enables TRQP, CTS records whether authorization and recognition checks were executed and includes their outcome in the run evidence.",
    },
    {
      id: "AYRA-VCDM-LDP-CONTEXT",
      title: "Issued Ayra card credentials use the expected W3C context",
      standard: "W3C Verifiable Credentials Data Model",
      version: "2.0",
      profile: "Ayra Business Card LDP draft",
      role: "issuer",
      level: "MUST",
      statement:
        "Ayra Business Card credentials issued by CTS must include the profile JSON-LD context and satisfy the repository schema validator before being used in holder or verifier flows.",
    },
  ],
  testCases: [
    {
      id: "CTS-VERIFIER-ACAPY-VERIFIED-TRUE",
      title: "ACA-Py verifier waits for verified=true",
      polarity: "positive",
      criterionRefs: ["AYRA-PP20-VERIFY-TRUE"],
      oracle: {
        summary:
          "The verifier task observes the proof record until ACA-Py reports verified=true and only then accepts the run.",
        successCondition: "proof_record.verified === true",
        expectedEvidence: ["presentationExchangeId", "final verified value"],
      },
      evidence: [
        "Jest assertion on task.state.status",
        "presentation exchange ID",
      ],
      runner: {
        commands: [
          "npx pnpm@9.1.0 exec jest tests/verifierAcaPyPipeline.test.ts --runInBand --config tests/jest.config.ts",
        ],
      },
    },
    {
      id: "CTS-VERIFIER-ACAPY-VERIFIED-FALSE",
      title: "ACA-Py verifier fails when done never becomes verified=true",
      polarity: "negative",
      criterionRefs: ["AYRA-PP20-VERIFY-TRUE"],
      oracle: {
        summary:
          "A proof record that reaches done but remains verified=false fails with a stable reason rather than being treated as success.",
        failureReason: "VERIFICATION_NOT_TRUE",
        expectedEvidence: [
          "presentationExchangeId",
          "final verified value",
          "failure reason",
        ],
      },
      evidence: ["Jest rejection message", "presentation exchange ID"],
      runner: {
        commands: [
          "npx pnpm@9.1.0 exec jest tests/verifierAcaPyPipeline.test.ts --runInBand --config tests/jest.config.ts",
        ],
      },
    },
    {
      id: "CTS-TRQP-VERIFY-BOTH-MODE",
      title: "Verifier records TRQP authorization and recognition checks",
      polarity: "positive",
      criterionRefs: ["AYRA-TRQP-AUTHZ-RECOGNITION"],
      oracle: {
        summary:
          "When TRQP mode is both, the verifier run captures both authorization and recognition checks in the report evidence.",
        successCondition:
          "trqp.authorization.checked === true && trqp.recognition.checked === true",
        expectedEvidence: [
          "TRQP mode",
          "authorization result",
          "recognition result",
        ],
      },
      evidence: ["verifier report summary", "TRQP check trace"],
      runner: {
        pendingReason:
          "AYR-3 must finalize the exact TRQP conformance criteria before this case becomes a deterministic CI runner.",
      },
    },
    {
      id: "CTS-AYRA-CARD-CONTEXT-VALID",
      title: "Ayra card JSON-LD context validates before issuance",
      polarity: "positive",
      criterionRefs: ["AYRA-VCDM-LDP-CONTEXT"],
      oracle: {
        summary:
          "The repository's Ayra Business Card JSON-LD context and example payload pass the local schema/context validation script.",
        successCondition: "validate-ayra-card-context exits with status 0",
        expectedEvidence: [
          "schema validator output",
          "context URL or file path",
        ],
      },
      evidence: ["validator stdout", "schema file path"],
      runner: {
        commands: [
          "npx pnpm@9.1.0 --filter cts-3 run validate:ayra-card-context",
        ],
      },
    },
  ],
};
