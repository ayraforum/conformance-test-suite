# CTS Contributor Guide

The Ayra Conformance Test Suite is protocol-conformance software. Every test must be traceable to a criterion, deterministic enough to reproduce, and clear enough for a maintainer to understand why a run passed or failed.

This guide describes how to add or update CTS criteria and test cases without weakening the repository rules in `AGENTS.md`.

## Core rules

- Do not invent protocol behavior. If the standard or Ayra profile does not define the behavior, mark the runner pending and link the pending reason to the missing criterion.
- Do not treat protocol completion as proof success. For positive proof-verification tests, success requires `verified === true`.
- Do not rely on undocumented ACA-Py, Credo, or agent defaults such as auto-verify, auto-remove, or implicit retries.
- Every failure must be visible and actionable. A maintainer should know what failed, why it failed, and where to find deeper evidence.
- Keep deterministic catalog validation separate from live agent or Docker-dependent interoperability tests.

## Where the catalog lives

The current CTS catalog is defined in:

- `conformance-stack/packages/cts/server/manifest/index.ts`

The manifest exports:

- `criteria`: normative rules CTS checks.
- `testCases`: runnable or pending cases that reference one or more criteria.
- `validateCtsManifest(manifest)`: the deterministic validator used by local checks and CI.

Run the catalog validator from `conformance-stack`:

```sh
npx pnpm@9.1.0 run validate:cts-manifest
```

## Adding a criterion

Add a new object to `criteria` with these required fields:

- `id`: Stable, unique identifier. Prefer a scoped prefix such as `AYRA-PP20-...`, `AYRA-TRQP-...`, or `AYRA-VCDM-...`.
- `title`: Short human-readable name.
- `standard`: The standard, RFC, or Ayra profile that defines the rule.
- `version`: The version or profile revision.
- `profile`: The Ayra profile this criterion belongs to.
- `role`: One of `holder`, `issuer`, `verifier`, or `trust-registry`.
- `level`: `MUST`, `SHOULD`, or `MAY`.
- `statement`: A plain-language rule that can be tested.

Example:

```ts
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
}
```

## Adding a test case

Add a new object to `testCases` with these required fields:

- `id`: Stable, unique identifier. Prefer `CTS-<ROLE>-<BEHAVIOR>`.
- `title`: Short human-readable scenario name.
- `polarity`: `positive` for expected success, `negative` for expected rejection or failure.
- `criterionRefs`: At least one existing criterion ID.
- `oracle`: The expected outcome and required evidence.
- `evidence`: Human-inspectable artifacts the test or report must expose.
- `runner`: Commands that run the test, or a pending reason if the case cannot be automated yet.

Positive tests must include `oracle.successCondition`. For verifier proof flows, the success condition must name `verified === true` when applicable.

Negative tests must include `oracle.failureReason`. Use a stable reason that appears in assertions, logs, or reports.

Example positive case:

```ts
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
  evidence: ["Jest assertion on task.state.status", "presentation exchange ID"],
  runner: {
    commands: [
      "npx pnpm@9.1.0 exec jest tests/verifierAcaPyPipeline.test.ts --runInBand --config tests/jest.config.ts",
    ],
  },
}
```

Example pending case:

```ts
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
    expectedEvidence: ["TRQP mode", "authorization result", "recognition result"],
  },
  evidence: ["verifier report summary", "TRQP check trace"],
  runner: {
    pendingReason:
      "AYR-3 must finalize the exact TRQP conformance criteria before this case becomes a deterministic CI runner.",
  },
}
```

## Evidence requirements

A CTS test is incomplete if it passes or fails without explaining why. Evidence should include enough context for a post-mortem without dumping secrets or private credential contents.

Recommended evidence by flow:

- Proof verification: proof exchange ID, webhook state transitions, verification request, verification response, final `verified` value, and failure reason.
- TRQP checks: mode, authorization check result, recognition check result, request target, response status, and any stable failure code.
- Credential/schema checks: schema path, context URL or file path, validator stdout, and failing field path.
- UI/report checks: concise outcome summary, failed step, root cause, and where to find deeper logs or traces.

## Runner command rules

Runner commands should be copy-pasteable from `conformance-stack` unless they explicitly state another working directory.

Use deterministic commands for CI-facing checks. Do not require Docker, ngrok, live agents, private credentials, or open ports for manifest validation.

Acceptable runner examples:

```sh
npx pnpm@9.1.0 run validate:cts-manifest
npx pnpm@9.1.0 exec jest tests/verifierAcaPyPipeline.test.ts --runInBand --config tests/jest.config.ts
npx pnpm@9.1.0 --filter cts-3 run validate:ayra-card-context
```

If a test cannot be automated yet, use `runner.pendingReason` instead of a fake command. The pending reason must say what external decision or implementation is missing.

## Local validation checklist

Before opening a pull request or asking for review:

- [ ] The ExecPlan in `docs/plans/` is updated if the change is non-trivial.
- [ ] Every new test case references at least one existing criterion.
- [ ] Every new criterion has a stable ID, standard, version/profile, role, level, and statement.
- [ ] Positive proof tests require `verified === true` where applicable.
- [ ] Negative tests have a stable `failureReason`.
- [ ] Every test case lists human-inspectable evidence artifacts.
- [ ] Every test case has runner commands or a specific pending reason.
- [ ] `npx pnpm@9.1.0 run validate:cts-manifest` passes from `conformance-stack`.
- [ ] `git diff --check` passes from the repository root.

## CI expectations

GitHub Actions runs the deterministic manifest validator from `conformance-stack` so catalog errors are reported separately from live agent or Docker-dependent tests.

The agent matrix test job may exercise Credo and ACA-Py behavior, but catalog validation must remain lightweight and independently diagnosable.
