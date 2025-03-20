import TaskRunner from "@/components/TaskRunner";
import { TestStep } from "@/components/BaseTask";

export default function TrustRegistryCheckPage() {
    const trustRegistryTitle = "Trust Registry Conformance Check";
    const trustRegistryDescription =
        "This process verifies your Ecosystem DID and checks if it conforms to the Trust Registry requirements.";

    const steps: TestStep[] = [
        {
            id: 201,
            name: "Enter Ecosystem DID",
            description: "Provide the Ecosystem DID you wish to be recognized.",
            status: "pending",
            content: (
                <div className="flex flex-col items-center p-4 border border-gray-300 rounded">
                    <p className="mb-2 font-semibold">
                        Enter your Ecosystem DID:
                    </p>
                    <input
                        type="text"
                        placeholder="did:example:ecosystem"
                        className="w-full max-w-xs border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            ),
        },
        {
            id: 202,
            name: "Verify DID",
            description:
                "The system verifies the correctness of the provided DID.",
            status: "pending",
        },
        {
            id: 203,
            name: "Check TRQP Conformance",
            description:
                "The system checks if the DID meets the Trust Registry conformance requirements.",
            status: "pending",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            {/* DID input for Trust Registry Check */}
            <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
                <label className="block text-lg font-medium text-gray-700 mb-2">
                    Enter the Ecosystem DID:
                </label>
                <input
                    type="text"
                    placeholder="did:example:ecosystem"
                    className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <TaskRunner
                name={trustRegistryTitle}
                description={trustRegistryDescription}
                steps={steps}
            />
        </div>
    );
}
