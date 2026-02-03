# CTS Verifier FAQ
## Testing Verifier Conformance in the Ayra Trust Network

This document answers common questions from the perspective of a **Verifier implementation**
being tested against the Ayra Conformance Test Suite (CTS).

It focuses on what the current CTS **verifier flow** enforces today, including TRQP enforcement.

This is a practical guide. It assumes you already have a verifier implementation and want
to understand how CTS evaluates it.

---

## 1. What does it mean to test a Verifier in CTS?

**Short answer**  
CTS acts as a holder and tests whether your verifier handles a Present Proof v2 exchange
correctly. In the ACA-Py verifier path, CTS enforces TRQP behavior.

---

## 2. What does CTS do in the verifier flow?

In the ACA-Py verifier path, CTS:
- Accepts your verifier's OOB invitation (DIDComm v2)
- Waits for your verifier to send a Present Proof v2 request
- Sends an Ayra Business Card presentation (W3C LDP, Ed25519Signature2020)
- Waits for your verifier's decision and checks that `verified` is true

When TRQP enforcement is enabled, CTS runs the flow twice:
- **Run 1**: Expect `verified` to be true
- **Run 2**: CTS removes TRQP authorization via the admin API, then expects `verified` to be false
- CTS restores TRQP authorization after run 2

---

## 3. What protocols and formats are used?

The current verifier flow uses:
- **DIDComm v2**
- **Present Proof v2**
- **W3C LDP** presentations with **Ed25519Signature2020**

CTS builds a DIF-style presentation for the Ayra Business Card and selects the
credential from the holder wallet by record id.

---

## 4. What does CTS consider a verifier success?

CTS requires:
- A completed proof exchange
- `verified` is true on run 1

With TRQP enforcement enabled, CTS additionally requires:
- `verified` is false after TRQP authorization is removed
- Authorization restored after run 2

CTS does **not** treat `state=done` as success unless `verified` is true.

---

## 5. How does CTS resolve the TRQP endpoint?

In the ACA-Py verifier path, CTS resolves the TRQP endpoint from the
credential's `credentialSubject.ecosystem_id` DID document. The DID document must
publish a TRQP service (`TRQP` or `TrustRegistryService`). If the service endpoint is
itself a DID, CTS resolves that DID to obtain the final TRQP URL.

DID resolution uses `NEXT_PUBLIC_DID_RESOLVER_URL` (defaulting to the public uniresolver).

---

## 6. What is required to enable TRQP enforcement?

To enable TRQP enforcement you must:
- Start the verifier flow with `verifyTRQP=true`
- UI equivalent: enable the **Verify TRQP** toggle before starting the flow
- Use an ACA-Py reference agent (`REFERENCE_AGENT=acapy`)
- Configure TRQP admin access:
  - `TRQP_ADMIN_BASE_URL`
  - Optional: `TRQP_ADMIN_AUTH_HEADER`, `TRQP_ADMIN_AUTH_TOKEN`

CTS also requires that the presented credential contains:
- `credentialSubject.ecosystem_id`
- `credentialSubject.ayra_trust_network_did`
- `credentialSubject.ayra_card_type`
- `credentialSubject.issuer_id` matching the credential issuer

Missing fields or failed DID resolution cause the flow to fail.

---

## 7. What happens if TRQP or DID resolution is unreachable?

When TRQP enforcement is enabled:
- Failure to resolve the ecosystem DID is a failure
- Missing TRQP services in the DID document is a failure
- An unreachable TRQP endpoint is a failure

The verifier must **fail closed**. Proceeding without authorization data is non-conformant.

---

## 8. How do I run the verifier flow?

1. Start CTS and the reference agent per `README.md`.
2. Open the CTS UI at `http://localhost:3000` and select the Verifier flow.
3. Paste the OOB invitation URL from your verifier, or upload a QR code.
4. Start the flow and monitor the logs.

---

## 9. Can CTS auto-send the proof request in demo mode?

Yes. If you are running an internal ACA-Py verifier controller for demos, CTS can auto-send
the proof request instead of waiting for an external verifier to do it.

Enable demo auto-send with:
- `ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST=true`

If no internal verifier controller is configured, CTS logs that auto-send is enabled but
cannot perform it.

---

## 10. ACA-Py verifier flow checklist

Use this quick checklist before running the ACA-Py verifier flow:

- `REFERENCE_AGENT=acapy`
- A verifier OOB invitation URL (DIDComm v2)
- The holder in this flow is the CTS reference holder
- Run the Issue flow to load an Ayra Business Card credential (W3C LDP) into the reference holder
- If TRQP enforcement is enabled:
  - `verifyTRQP=true`
  - `TRQP_ADMIN_BASE_URL` configured
  - Optional auth: `TRQP_ADMIN_AUTH_HEADER`, `TRQP_ADMIN_AUTH_TOKEN`
  - Ecosystem DID resolves to a TRQP service

---

## 11. What about the legacy verifier flow?

When CTS is not using the ACA-Py verifier path, it falls back to a legacy verifier flow
that uses a self-issued AnonCreds credential and a proof proposal. This path uses Credo
agents and is intended for demo and plumbing checks only. CTS does **not** certify AnonCreds.

---

## 12. Does CTS support OID4VC verifier tests?

Not today. OID4VC verifier tests are potentially on the roadmap.

---

## 13. What should I do if my Verifier flow fails?

You should:
1. Check the CTS app server output (terminal logs)
2. Check verifier logs
3. Confirm your OOB invitation is valid and reachable
4. Confirm the holder wallet has an Ayra Business Card credential
5. Re-run the test after fixing behavior

---

## 14. Where should Verifier-specific questions go?

- Conceptual questions -> [GitHub Discussions](https://github.com/ayraforum/conformance-test-suite/discussions)
- Suspected CTS defects -> [GitHub Issues](https://github.com/ayraforum/conformance-test-suite/issues) (include logs)
- TRQP or registry questions -> Reference the Ayra TRQP repo

This document defines expected Verifier behavior under the current CTS verifier flow.
