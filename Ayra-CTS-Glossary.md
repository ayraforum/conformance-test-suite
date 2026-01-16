## Glossary

This glossary explains key terms used throughout the Ayra Conformance Test Suite (CTS) and the community.
Each definition focuses on **why the term matters in the context of CTS**, not just what it stands for.

---

### W3C  
**World Wide Web Consortium**

An international standards body that publishes specifications for core web technologies, including Verifiable Credentials and Decentralized Identifiers.

**Why this matters to CTS**  
CTS relies on W3C standards as the foundational layer, but W3C compliance alone is not sufficient for Ayra conformance. CTS tests how these standards are used within governed, interoperable systems.

### LDP
**Linked Data Proofs**

A cryptographic proof format used with JSON-LD–based Verifiable Credentials, where a proof is applied over a canonicalized linked-data representation of the credential, typically expressed as a proof property associated with the credential or presentation.

**Why this matters to CTS**
When an interoperability profile allows or requires LDP, CTS validates that proofs are constructed, attached, and verified correctly according to the profile rules.

### VCDM 2.0  
**Verifiable Credentials Data Model, Version 2.0**

The W3C specification that defines the core data model for Verifiable Credentials and Verifiable Presentations, including credential structure, proof formats, and extensibility mechanisms.

**Why this matters to CTS**  
CTS enforces conformance to VCDM 2.0 where required by the active interoperability profile. A credential that is not valid under VCDM 2.0 semantics is non-conformant, even if it appears to work in practice.


### VC  
**Verifiable Credential**

A cryptographically verifiable data structure that allows an issuer to make claims about a subject, which a holder can later present to a verifier.

**Why this matters to CTS**  
CTS validates that credentials are structured, issued, and verified according to VCDM 2.0 and the rules of the selected interoperability profile, not merely that they are syntactically valid.


### VP  
**Verifiable Presentation**

A container used by a holder to present one or more verifiable credentials to a verifier, often with selective disclosure.

**Why this matters to CTS**  
CTS evaluates whether presentations are requested, constructed, and verified correctly within canonical interaction flows.


### DID  
**Decentralized Identifier**

A globally unique identifier controlled by the entity it represents and resolvable to a DID Document.

**Why this matters to CTS**  
CTS enforces when DIDs must be resolvable, when they must not be relied upon, and when authorization must instead be established through trust registries.



### DID Document

A machine-readable document associated with a DID that describes public keys, verification methods, and service endpoints.

**Why this matters to CTS**  
Some CTS flows require DID Document resolution. Others explicitly do not. CTS enforces the difference.


### DIDComm 2  
**Decentralized Identifier Communication, Version 2**

A secure, encrypted messaging protocol for agent-to-agent communication using DIDs.

**Why this matters to CTS**  
CTS uses DIDComm 2-style interactions to validate message sequencing, authorization behavior, and failure handling in canonical flows.

Note: DIDComm 2 and OID4VC address the same credential exchange problem using different architectural models. CTS enforces conformance to the model specified by the active interoperability profile and does not permit mixing assumptions between them.

### Aries  
**Hyperledger Aries**

A set of protocols, tools, and reference implementations for DID-based agents and credential exchange.

**Why this matters to CTS**  
Aries strongly influences CTS design, but CTS is not an Aries compliance test. Aries-based implementations may pass or fail CTS depending on behavior, not heritage.



### AIP  
**Aries Interop Profile**

A versioned profile defined by the Aries community that specifies how credentials, protocols, and message formats are combined to ensure interoperability.

**Why this matters to CTS**  
CTS tests conformance against specific Aries Interop Profiles. Stating the AIP version is mandatory when claiming conformance.


### AIP 2.0  
**Aries Interop Profile, Version 2.0**

A specific Aries Interop Profile defining supported credential formats, protocols, message structures, and constraints.

**Why this matters to CTS**  
CTS results are always scoped to a specific AIP version. A system conformant to AIP 2.0 may not be conformant to other profiles or future versions.



### OID4VC  
**OpenID for Verifiable Credentials**

A family of OpenID-based specifications that define how Verifiable Credentials and Verifiable Presentations are issued and presented using OAuth 2.0 and OpenID Connect flows.

**Why this matters to CTS**  
CTS validates correct OID4VC behavior where profiles require it, including request structure, authorization flows, cryptographic binding, and failure handling. Partial or permissive implementations that skip required steps are non-conformant.



### Trust Registry

A system that records which issuers and verifiers are authorized to participate in a governed ecosystem.

**Why this matters to CTS**  
CTS enforces that authorization is checked, not assumed. Trust registries are a first-class dependency in many canonical flows.



### TRQP  
**Trust Registry Query Protocol**

A protocol used to query trust registries for issuer and verifier authorization and recognition information.

**Why this matters to CTS**  
CTS can detect whether TRQP queries occurred and whether results were handled correctly. Skipping TRQP when required is a conformance failure.



### Canonical Flow

An authoritative reference interaction that defines the correct sequence of messages, checks, and outcomes for a given role and profile.

**Why this matters to CTS**  
CTS compares observed behavior to canonical flows. Deviations result in deterministic failures.



### Conformance

The property of behaving correctly within defined technical, governance, and trust constraints.

**Why this matters to CTS**  
CTS measures conformance, not feature richness or innovation.


### Interoperability

The ability of independent systems to work together.

**Why this matters to CTS**  
CTS goes beyond interoperability by enforcing authorized interoperability.



### Issuer

An entity that creates and signs verifiable credentials.

**Why this matters to CTS**  
CTS validates that issuers are authorized, and produce credentials that conform to the active profile. The CTS has a reference issuer and the ability to issue Ayra Credentials built in only as a utility not as a conformance flow.


## Holder

An entity that receives, stores, and presents verifiable credentials.

**Why this matters to CTS**  
CTS ensures holders respond correctly to presentation requests and do not fabricate or misuse credentials.



### Verifier  
**(Relying Party)**

An entity that requests and verifies credentials or presentations.

**Why this matters to CTS**  
Verifiers are the most common source of CTS failures, especially when they proceed without required authorization checks.



### Reference Agent

A known-good implementation used by CTS as a counterparty during tests.

**Why this matters to CTS**  
Reference agents establish baseline behavior against which implementations are evaluated.



### Pass

An indication that the tested system behaved correctly for a specific role, profile, and flow.

**Why this matters to CTS**  
A pass is scoped and does not imply blanket certification.



### Fail

An indication that the tested system violated a canonical rule, skipped a required check, or behaved incorrectly under defined conditions.

**Why this matters to CTS**  
Failures are expected and valuable. CTS is designed to surface them early.
