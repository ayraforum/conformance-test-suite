# Build and Extend the Ayra Conformance Test Suite

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan follows `PLANS.md` at the repository root. Any future implementation work for AYR-4 must update this file before and after meaningful changes.

## Purpose / Big Picture

AYR-4 extends the Ayra Conformance Test Suite (CTS) so implementers can run authoritative, reproducible tests against the standards and profiles Ayra supports. CTS users should gain three things they can observe immediately:

1. A machine-readable catalog of conformance criteria and test cases, so every runnable test maps to a stable rule and failure reason.
2. A repeatable automated runner for current standards, beginning with the current production baseline: DIDComm v2 Present Proof v2 with W3C Verifiable Credentials Data Model 2.0 Linked Data Proof credentials and optional TRQP v2 trust-registry checks.
3. CI and contributor documentation that prevent ad-hoc tests from being added without a criterion, oracle, evidence requirement, and deterministic failure mode.

This plan starts with infrastructure that is safe before AYR-3 is fully complete: a criteria/test manifest validator, contributor guide, and corrected CI path. Additional protocol cases will be added once AYR-3 defines final conformance criteria.

## Scope

Included in this plan:

- Role under test for the first implementation slice: Holder and Verifier flows already present in `conformance-stack`.
- Counterpart components CTS provides: the existing Credo reference agent and ACA-Py control service paths.
- Standards covered by the initial manifest: W3C VC Data Model 2.0, DID Core, TRQP v2.0, and Aries Present Proof v2 / JSON-LD attachment usage as currently represented in the repo.
- A catalog format that records criterion IDs, standard/profile versions, positive and negative test cases, oracle expectations, evidence artifacts, and runner commands.
- CI integration that installs and tests from `conformance-stack`, not the obsolete `certification-simple` path.
- Contributor guidance for adding future tests consistently.

Excluded until AYR-3 is completed:

- Final certification levels and full MUST/SHOULD/MAY matrices for every supported standard.
- OID4VP and OpenID DCQL executable tests. The current repo documents these as in-scope standards, but CTS has no executable OID4VP/DCQL stack yet.
- Changing protocol semantics in ACA-Py or Credo flows. This plan must not weaken the repository rule that positive proof success requires `verified === true`.

## Progress

- [x] (2026-05-09 17:47Z) Created this ExecPlan before changing CTS code, as required by `AGENTS.md` and `PLANS.md`.
- [x] (2026-05-09 17:47Z) Cloned `https://github.com/ayraforum/conformance-test-suite` into the Paperclip managed workspace and installed dependencies with `npx pnpm@9.1.0 install --frozen-lockfile`.
- [x] (2026-05-09 17:47Z) Ran baseline `npx pnpm@9.1.0 test -- --runInBand`; the existing suite fails before AYR-4 changes because it includes stateful Credo tests, port conflicts, stale module mapping in `tests/verifierAcaPyPipeline.test.ts`, and hangs with open handles.
- [x] (2026-05-09 17:58Z) Added a failing manifest-validation test that proves CTS rejects test cases without stable criteria, oracle, evidence, and runner metadata.
- [x] (2026-05-09 18:02Z) Implemented the manifest, validator, and `validate:cts-manifest` npm script until the new tests passed.
- [x] (2026-05-09 18:07Z) Added manifest HTTP route coverage and wired deterministic manifest/criteria endpoints into the CTS Express API.
- [x] (2026-05-09 18:09Z) Corrected GitHub Actions CI so it runs from `conformance-stack` and added a separate deterministic manifest-validation job.
- [x] (2026-05-09 18:09Z) Added `CONTRIBUTING-CTS.md` with required criterion, oracle, evidence, runner, and validation guidance.
- [x] (2026-05-09 18:09Z) Re-ran focused validation commands and recorded outputs here.
- [x] (2026-05-09 18:09Z) Opened pull request https://github.com/ayraforum/conformance-test-suite/pull/30 and verified the deterministic CTS manifest validation check passed.
- [x] (2026-05-09 23:35Z) Hardened the manifest validator so the contributor-guide-required identity fields and enum values are enforced before future CTS cases enter CI.
- [x] (2026-05-19 16:10Z) Restored the deterministic `check-types:tests` script by adding a scoped test TypeScript config for the CTS manifest tests without changing protocol semantics.
- [x] (2026-05-19) Hardened manifest traceability so future criteria cannot be added without at least one mapped test case and future test cases cannot omit a human-readable title.

## Surprises & Discoveries

- Observation: The repository already has a GitHub Actions workflow, but it references `certification-simple/pnpm-lock.yaml` and uses `working-directory: certification-simple`, which does not exist in the current checkout.
  Evidence: `.github/workflows/agent-matrix-tests.yml` lines 25-49.

- Observation: The baseline Jest suite is not currently clean on this machine after dependency install.
  Evidence: `npx pnpm@9.1.0 test -- --runInBand` failed with 12 failed suites and 9 passed suites. Representative failures include `tests/verifierAcaPyPipeline.test.ts` module mapping for `@demo/core/pipeline/src/nodes`, Credo agent tests with `EADDRINUSE :::3020`, DAG retry expectation failures, and open handles that kept Jest alive until the 600 second tool timeout.

- Observation: The root `check-types:tests` script currently references `tsconfig.test.json`, but that file is absent from `conformance-stack`.
  Evidence: `npx pnpm@9.1.0 run check-types:tests` failed with `error TS5058: The specified path does not exist: 'tsconfig.test.json'.`

- Observation: A broad all-test TypeScript config is not currently clean because existing non-CTS-manifest tests and pipeline mocks have pre-existing type drift.
  Evidence: broad test includes reported stale `AgentConfiguration` fixtures missing `endpoints`, custom Jest matcher typing gaps, and `MockTaskRunnerNode` missing the current `serialize` requirement. The AYR-4 config is therefore scoped to deterministic CTS manifest tests until those existing suites are remediated separately.

## Decision Log

- Decision: Start AYR-4 with a manifest and validation layer rather than inventing new protocol behavior.
  Rationale: AYR-3 is still not done, so final criteria are not authoritative. A manifest validator creates enforceable structure for future criteria without guessing protocol semantics.
  Date/Author: 2026-05-09 / Case (CTO)

- Decision: Keep the first executable validation independent of live agents, Docker, ngrok, or private credentials.
  Rationale: CI and contributor checks must be deterministic and safe. Live interoperability flows remain necessary for full CTS, but the catalog validator should run anywhere.
  Date/Author: 2026-05-09 / Case (CTO)

## Outcomes & Retrospective

The first AYR-4 implementation slice is now reviewable: CTS has a manifest/validator, HTTP manifest endpoints, a deterministic CI validation job, and a contributor guide for future criteria and tests. Full AYR-4 remains open for additional protocol cases and standard-specific runner coverage once AYR-3 finalizes the remaining conformance criteria.

## Context and Orientation

Repository root: `conformance-test-suite`.

Primary runtime: `conformance-stack`, a pnpm workspace with a Next.js UI, Express backend, TypeScript test pipelines, Credo reference-agent code, TRQP package, and an ACA-Py control service.

Important paths:

- `AGENTS.md`: repository-specific rules for AI agents. It forbids relying on implicit proof success and requires ExecPlans for non-trivial CTS work.
- `PLANS.md`: required ExecPlan format.
- `README.md`: current user-facing overview of CTS coverage.
- `conformance-stack/package.json`: workspace-level scripts, including Jest tests and validation commands.
- `conformance-stack/packages/cts/server/pipelines`: server-side test pipelines for holder, verifier, issue, TRQP, and ACA-Py flows.
- `conformance-stack/tests/verifierAcaPyPipeline.test.ts`: existing focused Jest tests for ACA-Py verifier behavior.
- `conformance-stack/packages/cts/schema`: W3C/Ayra credential schemas and examples.
- `conformance-stack/packages/trqp/api/openapi.v2.yaml`: TRQP API contract used by the local TRQP package.

Definitions:

- Criterion: a precise rule an implementation must satisfy, such as “a positive verifier run only passes when proof verification returns `verified === true`.”
- Test case: a runnable positive or negative exercise of one or more criteria.
- Oracle: the canonical expected behavior and evidence for a test case, including required messages, states, fields, and failure reasons.
- Evidence: logs, traces, exchange IDs, report summaries, and machine-readable artifacts that explain why a run passed or failed.

## Architecture and Data Flow

Current CTS flows use the web UI and server pipelines to orchestrate a role under test. CTS either provides a reference counterpart agent or connects to a target implementation. During a run, tasks are arranged as a directed acyclic graph. Each task performs one observable step, such as establishing a connection, requesting a proof, checking TRQP authorization/recognition, or waiting for proof verification. The UI receives updates and renders a human-readable outcome.

The new manifest layer sits outside the live protocol path. It defines which standards, criteria, test cases, runner commands, oracle expectations, and evidence outputs are expected. The validator checks that every catalog entry is traceable and complete before code reaches CI. Later runner work can consume the same manifest to select and execute subsets by standard, role, profile, or conformance level.

## Plan of Work

1. Add a Jest test under `conformance-stack/tests/ctsManifest.test.ts`. The test imports a validator and a manifest fixture. It asserts that the shipped manifest is valid and that malformed cases fail with stable messages for missing criteria, oracle, evidence, and runner command data.

2. Add a manifest module under `conformance-stack/packages/cts/server/manifest/`. It should export TypeScript types, the current `ayra-didcomm-v1` manifest, and `validateCtsManifest(manifest)`.

3. Add an npm script at `conformance-stack/package.json`, for example `validate:cts-manifest`, that runs the focused manifest test or a small validator command. This script must not require Docker, ngrok, live agents, secrets, or open ports.

4. Correct `.github/workflows/agent-matrix-tests.yml` so cache paths and working directories target `conformance-stack`. Add a lightweight job or step for the manifest validator. Keep live ACA-Py/Credo tests separate from the deterministic manifest validation so CI can report clear failures.

5. Add `CONTRIBUTING-CTS.md` at the repository root. Explain how to add a criterion, test case, oracle, evidence requirement, and runner command. Include examples and a checklist.

6. Update this ExecPlan with the validation transcript and any surprises.

## Oracle and Conformance Rules

Initial manifest rules:

- Every criterion has a stable ID, standard, version or profile, role, normative level, and plain-language statement.
- Every test case references at least one criterion and declares whether it is a positive or negative test.
- Every positive test states its success condition. For proof verification flows, success must include `verified === true` where applicable.
- Every negative test states a named failure reason and the rule violated.
- Every test case lists evidence artifacts that a human can inspect.
- Every test case lists at least one runner command or marks the command as pending with a reason tied to AYR-3.

The first oracle lives in the manifest itself. Later protocol-specific oracles may move to JSON/YAML fixtures, but they must remain referenced by the manifest.

## Test Cases

Initial validator tests:

- Positive: the shipped manifest validates.
- Negative: a test case with no criterion reference fails with a message containing `criterionRefs`.
- Negative: a test case with no oracle fails with a message containing `oracle`.
- Negative: a test case with no evidence artifacts fails with a message containing `evidence`.
- Negative: a test case with neither runner commands nor a pending runner reason fails with a message containing `runner`.
- Negative: a criterion that is not referenced by any test case fails with a message containing `must be referenced by at least one test case`.
- Negative: a test case without a human-readable title fails with a message containing `title`.

Future protocol tests will map to AYR-3 criteria once AYR-3 is done.

## Concrete Steps

Commands are run from the repository root unless noted.

    $ cd conformance-stack
    $ npx pnpm@9.1.0 install --frozen-lockfile
    Expected: dependencies install without lockfile changes.

    $ npx pnpm@9.1.0 jest tests/ctsManifest.test.ts --runInBand
    Expected before implementation: failing test proves missing validator/manifest.
    Expected after implementation: all manifest tests pass.

    $ npx pnpm@9.1.0 run validate:cts-manifest
    Expected: focused manifest validation passes without Docker/ngrok/secrets.

    $ git diff --check
    Expected: no whitespace errors.

## Validation and Acceptance

This slice is accepted when:

- `npx pnpm@9.1.0 run validate:cts-manifest` passes.
- `git diff --check` passes.
- The GitHub Actions workflow references the real `conformance-stack` workspace and includes the deterministic manifest validation.
- `CONTRIBUTING-CTS.md` explains the required fields for new criteria and test cases.
- This ExecPlan records the baseline suite failures separately from new validation results so reviewers can distinguish pre-existing instability from AYR-4 changes.

The full AYR-4 issue remains open until new test cases, runner coverage for each supported standard, contributor guide, and CI integration are complete.

## Security, Privacy, and Tenant Isolation

The manifest validator introduces no network calls and no secret handling. It should not inspect real credentials, PII, or live protocol payloads. Future evidence artifacts must redact secrets and avoid storing private credential contents unless a specific CTS environment explicitly authorizes it.

Live CTS flows are multi-tenant in intent but not production-hardened. Existing README security warnings remain in force: do not expose the dev stack to public networks or process real credentials without additional hardening.

## Idempotence and Recovery

Manifest validation is read-only and safe to rerun. Dependency installation uses `--frozen-lockfile`, so it should not mutate the lockfile. If a new manifest entry breaks validation, remove or correct the entry and rerun `validate:cts-manifest`.

If CI workflow changes break GitHub Actions, revert `.github/workflows/agent-matrix-tests.yml` and reapply in smaller steps.

## Artifacts and Notes

Baseline test transcript excerpt from 2026-05-09:

    npx pnpm@9.1.0 test -- --runInBand
    Test Suites: 12 failed, 9 passed, 21 total
    Tests: 20 failed, 61 passed, 81 total
    Representative failures: stale moduleNameMapper in tests/verifierAcaPyPipeline.test.ts, Credo agent EADDRINUSE :::3020, DAG retry expectation failures, Jest open handles.

Focused validator transcript from 2026-05-09:

    cd conformance-stack
    npx pnpm@9.1.0 validate:cts-manifest
    PASS @credo-ts/e2e-test tests/ctsManifestRoutes.test.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 2 passed, 2 total
    Tests: 6 passed, 6 total

Final focused validation transcript from 2026-05-09:

    cd conformance-stack
    npx pnpm@9.1.0 run validate:cts-manifest
    PASS @credo-ts/e2e-test tests/ctsManifestRoutes.test.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 2 passed, 2 total
    Tests: 6 passed, 6 total

    git diff --check
    # no output; exit status 0

Manifest hardening validation transcript from 2026-05-09:

    cd conformance-stack
    npx pnpm@9.1.0 exec jest tests/ctsManifest.test.ts --runInBand --config tests/jest.config.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 1 passed, 1 total
    Tests: 8 passed, 8 total

    npx pnpm@9.1.0 run validate:cts-manifest
    PASS @credo-ts/e2e-test tests/ctsManifestRoutes.test.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 2 passed, 2 total
    Tests: 9 passed, 9 total

    git diff --check
    # no output; exit status 0

    npx pnpm@9.1.0 run check-types:tests
    error TS5058: The specified path does not exist: 'tsconfig.test.json'.

Focused TypeScript and manifest validation transcript from 2026-05-19:

    cd conformance-stack
    npx pnpm@9.1.0 run check-types:tests
    # tsc -p tsconfig.test.json --noEmit
    # exit status 0

    npx pnpm@9.1.0 run validate:cts-manifest
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    PASS @credo-ts/e2e-test tests/ctsManifestRoutes.test.ts
    Test Suites: 2 passed, 2 total
    Tests: 9 passed, 9 total

    git diff --check
    # no output; exit status 0

Traceability hardening transcript from 2026-05-19:

    cd conformance-stack
    npx pnpm@9.1.0 exec jest tests/ctsManifest.test.ts --runInBand --config tests/jest.config.ts
    FAIL @credo-ts/e2e-test tests/ctsManifest.test.ts
    Failing tests: requires every criterion to be referenced by at least one test case; requires every test case to include a human-readable title

    npx pnpm@9.1.0 exec jest tests/ctsManifest.test.ts --runInBand --config tests/jest.config.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 1 passed, 1 total
    Tests: 10 passed, 10 total

    npx pnpm@9.1.0 run validate:cts-manifest
    PASS @credo-ts/e2e-test tests/ctsManifestRoutes.test.ts
    PASS @credo-ts/e2e-test tests/ctsManifest.test.ts
    Test Suites: 2 passed, 2 total
    Tests: 11 passed, 11 total

    npx pnpm@9.1.0 run check-types:tests
    # tsc -p tsconfig.test.json --noEmit
    # exit status 0

    npx pnpm@9.1.0 exec prettier --check tests/ctsManifest.test.ts packages/cts/server/manifest/index.ts ../docs/plans/ayr-4-cts-extension.md
    All matched files use Prettier code style!

    git diff --check
    # no output; exit status 0

Pull request and CI evidence from 2026-05-09:

    PR: https://github.com/ayraforum/conformance-test-suite/pull/30
    Branch: ayr-4-cts-extension-slice
    Code commit verified: 4c5cf89
    GitHub Actions latest PR run: CTS manifest validation passed in 51s; live Jest matrix skipped on pull_request and remains manual via workflow_dispatch.

## Interfaces and Dependencies

No new external dependencies are planned for the first slice. The validator should use TypeScript/Jest already present in `conformance-stack`. The CI workflow continues to use `actions/checkout@v4`, `actions/setup-node@v4`, Node 18, and pnpm 9.1.0 through Corepack.
