## CTS Fundamentals FAQ


### 1. What is the Ayra Conformance Test Suite?

**Short answer**  
The Ayra Conformance Test Suite (CTS) verifies that holders, and verifiers behave correctly within the Ayra Trust Network, not just that they implement standards.

**Why it exists**  
Standards compliance alone does not guarantee interoperability, authorization, or trust. CTS asserts that real systems interact correctly under Ayra governance, trust registry, and interoperability profile rules.

**What CTS does**  
- Executes canonical interaction flows  
- Verifies authorization via trust registries  
- Validates protocol behavior and message sequencing  
- Confirms credential semantics and profile adherence  

**What CTS does not do**  
- It does not certify business policy  
- It does not validate UX quality  
- It does not replace unit or integration testing  



### 2. Who should run the CTS?

**You should run CTS if you are**  
- Issuing Ayra-aligned credentials  
- Verifying credentials across ecosystems  
- Operating a wallet that claims Ayra compatibility  
- Operating or participating in an Ayra-recognized trust registry  

**You probably do not need CTS if you are**  
- Experimenting locally with credentials  
- Building a closed, single-ecosystem prototype  
- Testing only internal flows without external trust assertions  


### 3. What does “conformant” mean in Ayra terms?

**Short answer**  
Conformant means your system behaves correctly in context, not just in isolation.

Conformance asserts correct authorization, correct sequencing, correct data semantics, and correct failure behavior when trust conditions are not met.



### 4. How is CTS different from interoperability testing?

Interoperability testing asks whether two systems can communicate.

CTS asserts whether they *should* communicate and whether they did so under correct trust, governance, and authorization rules.


### 5. What roles does CTS support?

CTS evaluates systems acting as one or more of the following roles:

- Holder  
- Verifier  

Each test run is role-scoped.



### 6. What happens during a CTS test run?

1. A role under test is selected  
2. A canonical profile or flow is selected  
3. CTS establishes reference counterparts  
4. The canonical interaction is executed  
5. CTS observes messages and registry interactions  
6. Observed behavior is compared to canonical definitions  
7. CTS reports pass or fail with reasons  


### 7. What are canonical flows?

Canonical flows are authoritative reference interactions defining required message order, checks, data elements, and failure conditions.

They define expected network behavior.


### 8. Where do canonical flows come from?

Canonical flows are derived from:

- Aries Interoperability Profiles & RFCs
- Trust Registry Query Protocol expectations  
- Credential governance frameworks  
- [Ayra governed artifacts](https://github.com/ayraforum/ayra-governed-artifacts)  


### 9. What happens if my system deviates from the canonical flow?

CTS fails the test.

Skipping required authorization checks, accepting unauthorized credentials, or completing flows that should fail are all non-conformant behaviors.


### 10. Does CTS require trust registry access?

Yes, when required by the profile.

If authorization is required and the registry is unreachable or returns a failure, CTS fails the test.


### 11. Can CTS detect whether a verifier consulted the trust registry?

Yes. CTS can observe the registry endpoint or manipulate registry rules to determine required lookup behavior.


### 12. What credential formats are supported?

CTS supports credential formats explicitly defined by active Ayra governed artifacts. 


### 13. What does CTS validate in a credential?

CTS validates required claims, claim semantics, data types, profile constraints, issuer authorization context, and registry recognition.


### 14. Can I use my own implementation in CTS?

Yes. CTS evaluates behavior, not technology choices. You bring your own implementation for the role under test.


### 15. Does CTS require a specific agent or wallet?

No. Reference agents may be used internally, but any compliant implementation may be tested.


### 16. What does a CTS failure mean?

A CTS failure indicates a violation of canonical rules, missing authorization, prohibited behavior, or incorrect failure handling.


### 17. Is CTS a certification?

No, not at this time. CTS is a technical conformance mechanism. Certification programs may build on it.


### 18. What does a CTS pass mean?

A pass means the system behaved correctly for the tested role, profile, and flow, and that your agent in that role can participate with other agents in the Ayra ecosystem.



### 19. How does CTS evolve?

CTS evolves by adding profiles, flows, and tightening previously ambiguous behavior. Backward compatibility is not guaranteed for undefined behavior.



### 20. What is the most common CTS failure?

Systems proceeding when they should stop, especially when authorization is missing or unreachable.



### 21. Where should unanswered questions go?

- Questions: [GitHub Discussions](https://github.com/ayraforum/conformance-test-suite/discussions) 
- Defects or incorrect behavior: [GitHub Issues](https://github.com/ayraforum/conformance-test-suite/issues)  



### 22. What is CTS explicitly not trying to solve?

CTS is not a UX test framework, business audit tool, governance authority, or developer convenience harness.

CTS exists to protect the trust layer.
