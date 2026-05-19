import {
  buildCtsRunnerPlan,
  ctsManifest,
  listCtsStandards,
  validateCtsManifest,
  type CtsManifest,
} from "../packages/cts/server/manifest";

const cloneManifest = (): CtsManifest =>
  JSON.parse(JSON.stringify(ctsManifest));

describe("CTS manifest validation", () => {
  test("accepts the shipped manifest", () => {
    expect(validateCtsManifest(ctsManifest)).toEqual([]);
  });

  test("requires every test case to reference at least one criterion", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].criterionRefs = [];

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].criterionRefs must reference at least one known criterion"
    );
  });

  test("rejects duplicate criterion and test case identifiers", () => {
    const manifest = cloneManifest();
    manifest.criteria[1].id = manifest.criteria[0].id;
    manifest.testCases[1].id = manifest.testCases[0].id;

    expect(validateCtsManifest(manifest)).toEqual(
      expect.arrayContaining([
        "criteria[1].id duplicates AYRA-PP20-VERIFY-TRUE",
        "testCases[1].id duplicates CTS-VERIFIER-ACAPY-VERIFIED-TRUE",
      ])
    );
  });

  test("requires every criterion to include required descriptive fields", () => {
    const manifest = cloneManifest();
    manifest.criteria[0].title = "";
    manifest.criteria[0].role = "" as any;
    manifest.criteria[0].level = "" as any;

    expect(validateCtsManifest(manifest)).toEqual(
      expect.arrayContaining([
        "criteria[0].title is required",
        "criteria[0].role must be one of holder, issuer, verifier, trust-registry",
        "criteria[0].level must be one of MUST, SHOULD, MAY",
      ])
    );
  });

  test("requires every criterion to be referenced by at least one test case", () => {
    const manifest = cloneManifest();
    manifest.criteria.push({
      id: "AYRA-UNMAPPED-CRITERION",
      title: "Unmapped criterion",
      standard: "Ayra CTS",
      version: "draft",
      profile: "Traceability test",
      role: "verifier",
      level: "MUST",
      statement:
        "Every criterion must have executable or pending test coverage.",
    });

    expect(validateCtsManifest(manifest)).toContain(
      "criteria[3].id AYRA-UNMAPPED-CRITERION must be referenced by at least one test case"
    );
  });

  test("requires every test case to include a human-readable title", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].title = "";

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].title is required"
    );
  });

  test("requires every test case to use a valid polarity", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].polarity = "maybe" as any;

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].polarity must be one of positive, negative"
    );
  });

  test("requires an oracle expectation for every test case", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].oracle = undefined as any;

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].oracle is required"
    );
  });

  test("requires inspectable evidence for every test case", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].evidence = [];

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].evidence must list at least one artifact"
    );
  });

  test("requires runner commands or an explicit pending-runner reason", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].runner = { commands: [] };

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].runner must include commands or pendingReason"
    );
  });
});

describe("CTS manifest runner planning", () => {
  test("lists standards from the criteria catalog in stable order", () => {
    expect(listCtsStandards(ctsManifest)).toEqual([
      "Aries RFC 0454 Present Proof v2",
      "Trust Registry Query Protocol",
      "W3C Verifiable Credentials Data Model",
    ]);
  });

  test("builds a runnable plan for one standard without pending cases", () => {
    const plan = buildCtsRunnerPlan(ctsManifest, {
      standard: "W3C Verifiable Credentials Data Model",
    });

    expect(plan.runnable).toEqual([
      {
        testCaseId: "CTS-AYRA-CARD-CONTEXT-VALID",
        title: "Ayra card JSON-LD context validates before issuance",
        polarity: "positive",
        criteria: [
          {
            id: "AYRA-VCDM-LDP-CONTEXT",
            standard: "W3C Verifiable Credentials Data Model",
            role: "issuer",
          },
        ],
        commands: [
          "npx pnpm@9.1.0 --filter cts-3 run validate:ayra-card-context",
        ],
      },
    ]);
    expect(plan.pending).toEqual([]);
  });

  test("keeps AYR-3-dependent standards pending instead of inventing runner behavior", () => {
    const plan = buildCtsRunnerPlan(ctsManifest, {
      standard: "Trust Registry Query Protocol",
    });

    expect(plan.runnable).toEqual([]);
    expect(plan.pending).toEqual([
      {
        testCaseId: "CTS-TRQP-VERIFY-BOTH-MODE",
        title: "Verifier records TRQP authorization and recognition checks",
        polarity: "positive",
        criteria: [
          {
            id: "AYRA-TRQP-AUTHZ-RECOGNITION",
            standard: "Trust Registry Query Protocol",
            role: "verifier",
          },
        ],
        pendingReason:
          "AYR-3 must finalize the exact TRQP conformance criteria before this case becomes a deterministic CI runner.",
      },
    ]);
  });
});
