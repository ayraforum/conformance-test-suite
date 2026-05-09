import {
  ctsManifest,
  validateCtsManifest,
  type CtsManifest,
} from "../packages/cts/server/manifest";

const cloneManifest = (): CtsManifest => JSON.parse(JSON.stringify(ctsManifest));

describe("CTS manifest validation", () => {
  test("accepts the shipped manifest", () => {
    expect(validateCtsManifest(ctsManifest)).toEqual([]);
  });

  test("requires every test case to reference at least one criterion", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].criterionRefs = [];

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].criterionRefs must reference at least one known criterion",
    );
  });

  test("requires an oracle expectation for every test case", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].oracle = undefined as any;

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].oracle is required",
    );
  });

  test("requires inspectable evidence for every test case", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].evidence = [];

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].evidence must list at least one artifact",
    );
  });

  test("requires runner commands or an explicit pending-runner reason", () => {
    const manifest = cloneManifest();
    manifest.testCases[0].runner = { commands: [] };

    expect(validateCtsManifest(manifest)).toContain(
      "testCases[0].runner must include commands or pendingReason",
    );
  });
});
