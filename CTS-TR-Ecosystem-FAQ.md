# CTS Trust Registry / Ecosystem FAQ
## Trust, Recognition, and Authorization in the Ayra Trust Network

This document answers common questions from the perspective of an **Ecosystem Operator**
or **Trust Registry operator** whose registry is being used by the Ayra Conformance Test Suite (CTS) via TRQP.

It explains what CTS expects from a Trust Registry, what is being asserted during conformance testing, and how ecosystem governance is enforced today.

This is a practical guide. It assumes you operate, integrate with, or publish data for an Ayra-aligned Trust Registry.

---

## 1. What is being tested for a Trust Registry or Ecosystem in CTS?

**Short answer**  
CTS primarily tests **verifier behavior that depends on Trust Registry data**. The
Trust Registry is treated as an authoritative external dependency, not a component
that CTS certifies on its own.

CTS asserts that:
- Verifiers consult the registry when required
- Registry responses are enforced correctly
- Flows fail when registry data is missing, negative, or unreachable

CTS does not score:
- Registry uptime or performance
- Registry UI or admin workflows
- Registry internal data models beyond TRQP responses

CTS also includes an explicit **TRQP test flow** that covers TRQP conformance and Ayra Extensions. The `/registry` test interface is intended for operational checks and troubleshooting, not formal certification of a registry.

---

## 2. What is the role of an Ecosystem in CTS?

An **ecosystem** defines the governance context in which trust decisions are made.

In CTS:
- An ecosystem is identified by a DID (`ecosystem_id`)
- That DID resolves to a DID Document
- The DID Document publishes a TRQP service

The ecosystem defines:
- Which Trust Registry is authoritative
- Which participants are recognized
- What authorization rules apply

CTS treats the ecosystem as the **trust boundary**.

---

## 3. What is the Ayra Trust Registry (Ayra TR)?

The Ayra Trust Registry is the authoritative registry for the Ayra Trust Network.

It:
- Records recognized participants (issuers and verifiers)
- Records authorization rules (for example, who may issue which credential types)
- Is queried via TRQP during CTS flows when enforcement is enabled

CTS assumes the Ayra TR is correct and authoritative.
CTS does not attempt to second-guess registry policy.

---

## 4. What is TRQP and how is it used by CTS?

**TRQP (Trust Registry Query Protocol)** is the protocol used by verifiers to query
a Trust Registry for recognition and authorization data.

In CTS:
- TRQP is invoked by the verifier
- TRQP responses determine whether a flow succeeds or fails
- CTS may use a TRQP admin API (when configured) to change authorization state during a test

Holders do not call TRQP and do not interpret registry data.

---

## 5. What is being "recognized" in a recognition check?

Recognition answers the question:

> "Is this issuer or verifier a recognized participant in this ecosystem?"

More precisely:
- Recognition applies to **actors** (issuers or verifiers)
- Recognition is scoped to an **ecosystem**
- Recognition data is sourced from the **Trust Registry**

Only participants are recognized *within* an ecosystem.

---

## 6. What is being authorized in an authorization check?

Authorization answers the question:

> "Is this recognized participant allowed to perform this action?"

For example:
- Is this issuer authorized to issue an Ayra Business Card?
- Is this verifier authorized to request or rely on that credential?

Authorization is:
- Scoped to an ecosystem
- Evaluated using Trust Registry rules
- Enforced by the verifier

---

## 7. How does CTS resolve which Trust Registry to use?

CTS determines the Trust Registry endpoint through the **ecosystem DID**.

In the ACA-Py verifier path:
- CTS extracts `credentialSubject.ecosystem_id`
- Resolves the ecosystem DID document
- Looks for a `TRQP` or `TrustRegistryService` entry
- Resolves that service endpoint to obtain the TRQP URL

If any step fails, the flow fails when TRQP enforcement is enabled.

---

## 8. What happens if TRQP data changes during a CTS run?

When TRQP enforcement is enabled and admin access is configured, CTS tests verifier
behavior by changing registry state:

- CTS runs the verifier flow once with authorization present
- CTS removes authorization via the TRQP admin API
- CTS runs the flow again and expects failure
- CTS restores authorization after the test

This validates that verifiers are not caching or ignoring registry data.

---

## 9. What happens if the Trust Registry is unreachable?

When TRQP enforcement is enabled:
- Failure to reach the registry is a failure
- Failure to resolve the ecosystem DID is a failure
- Missing TRQP services in the DID document is a failure

CTS expects verifiers to **fail closed**.
Proceeding without registry data is non-conformant.

---

## 10. What data does CTS expect to exist for TRQP checks?

For Ayra Business Card flows, CTS expects the credential to contain:

- `credentialSubject.ecosystem_id`
- `credentialSubject.ayra_trust_network_did`
- `credentialSubject.ayra_card_type`
- `credentialSubject.issuer_id` matching the credential issuer

These fields allow CTS and the verifier to map the credential to:
- An ecosystem
- A Trust Registry
- An authorization rule

Missing or inconsistent fields cause TRQP mapping to fail.

---

## 11. Does CTS require a specific Trust Registry implementation?

No.

CTS requires:
- A TRQP-compliant endpoint
- Stable, resolvable ecosystem DIDs
- Deterministic responses for recognition and authorization queries

CTS does not require:
- A specific database
- A specific admin UI
- A specific hosting model

---

## 12. Does CTS certify the Trust Registry itself?

**Short answer**  
CTS does not certify governance or infrastructure, but it **does** run a TRQP
conformance flow that checks registry endpoints for **authorization**, **recognition**,
and **Ayra Extensions**.

CTS conformance here means:
- The TRQP endpoints behave correctly for the required queries
- The Ayra Extensions are present and respond as expected

CTS does **not** certify:
- Registry uptime or operational SLAs
- Policy correctness or governance decisions
- Internal implementation choices

A Trust Registry may be technically correct but still fail CTS-based flows if:
- Verifiers do not consult it
- Verifiers ignore its responses
- Ecosystem metadata is mispublished

---

## 13. Where should Trust Registry or Ecosystem questions go?

- Governance or ecosystem questions -> [GitHub Discussions](https://github.com/ayraforum/conformance-test-suite/discussions)
- TRQP implementation questions -> Ayra TRQP repository
- Suspected CTS defects -> [GitHub Issues](https://github.com/ayraforum/conformance-test-suite/issues) (include logs)

This document defines how Trust Registries and ecosystems participate
in CTS-enforced trust today.
