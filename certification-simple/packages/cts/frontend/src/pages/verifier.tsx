import { VerifierTest } from "@/components/tests/VerifierTest";
import { VerifierConnector } from "@/components/connectors";

export default function VerifierTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Verifier Conformance Test</h1>
      <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8">
        This test verifies if a Verifier implements the required functionality
        for connection, presentation request, and verification.
      </p>
      
      <VerifierConnector>
        <VerifierTest />
      </VerifierConnector>
    </div>
  );
}
