import { HolderTest } from "@/components/tests/HolderTest";
import { HolderConnector } from "@/components/connectors";

export default function HolderTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Holder Conformance Test</h1>
      <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8">
        This test verifies if a Holder wallet implements the required functionality
        for connection and presentation protocols.
      </p>
      
      <HolderConnector>
        <HolderTest />
      </HolderConnector>
    </div>
  );
}
