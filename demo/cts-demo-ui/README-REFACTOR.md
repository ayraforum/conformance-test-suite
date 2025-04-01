# Refactoring Notes for Ayra Conformance Test Suite

## Overview

The codebase has been refactored to improve maintainability, reduce duplication, and make components more reusable. This document provides guidance on the restructuring.

## New Structure

- `/services/BaseTestContext.ts` - Base context for all tests
- `/services/tests/` - Test-specific context types
- `/components/TestRunner.tsx` - Generic test runner component
- `/components/steps/` - Step components organized by test type
- `/components/tests/` - Test runner implementations 

## Deprecated Files

The following files are deprecated and can be safely removed:

1. `/components/ApiConformanceStep.tsx` - Replaced by `/components/steps/ApiConformanceStep.tsx`
2. `/components/AuthorizationResultStep.tsx` - Replaced by step-specific components
3. `/components/AuthorizationVerificationStep.tsx` - Replaced by `/components/steps/AuthorizationVerificationStep.tsx`
4. `/components/DIDResolutionStep.tsx` - Replaced by `/components/steps/DIDResolutionStep.tsx`
5. `/components/ConformanceReport.tsx` - Replaced by `/components/steps/ReportStep.tsx`
6. `/components/TrustRegistryTask.tsx` - Replaced by general `TestRunner` component
7. `/components/TrustRegistryTestRunner.tsx` - Replaced by `/components/tests/TrustRegistryTest.tsx`

## Tests Implemented

1. **Trust Registry Test** - Tests DID resolution, API conformance, and authorization verification
2. **Holder Test** - Tests wallet connection, credential issuance, and presentation
3. **Verifier Test** - Tests connection, presentation requests, and verification

## Pages

- `/` - Home page with links to all tests
- `/registry` - Trust Registry test
- `/holder` - Holder test
- `/verifier` - Verifier test

## Future Development

When adding new tests, follow the established pattern:
1. Create a context type in `/services/tests/`
2. Create step components in `/components/steps/[test-type]/`
3. Create a test component in `/components/tests/`
4. Create a page in `/pages/`
