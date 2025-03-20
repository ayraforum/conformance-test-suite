import TaskRunner from "@/components/TaskRunner";
import { TestStep } from "@/components/BaseTask";
import RenderQRCode from "@/components/RenderQRCode";

export default function VerifierPage() {
    const steps: TestStep[] = [
        {
            id: 101,
            name: "Initialize Connection",
            description:
                "Scan the QR code to establish a connection with the wallet.",
            status: "pending",
            content: (
                <div className="flex flex-col items-center p-4 border border-gray-300 rounded">
                    <p className="mb-2 font-semibold">
                        Scan this QR code to initialize the connection:
                    </p>
                    <RenderQRCode
                        value="https://example.com/connection-invite"
                        size={180}
                    />
                </div>
            ),
        },
        {
            id: 102,
            name: "Send Proof Request",
            description: "Request a proof from the wallet.",
            status: "pending",
        },
        {
            id: 103,
            name: "Receive Proof",
            description: "Wallet responds with the proof.",
            status: "pending",
        },
        {
            id: 104,
            name: "Validate Proof",
            description: "Verifier checks the proof’s validity.",
            status: "pending",
        },
        {
            id: 105,
            name: "Validate Recognition Status In Ayra Network",
            description:
                "Verifier checks the recognition status in Ayra Network.",
            status: "pending",
        },
        {
            id: 106,
            name: "Check Authorization In Ecosystem",
            description:
                "Verifier checks authorization in the target ecosystem.",
            status: "pending",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
                <label className="block text-lg font-medium text-gray-700 mb-2">
                    Enter the DID of the organization running the test:
                </label>
                <input
                    type="text"
                    placeholder="did:example:123456789"
                    className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <TaskRunner steps={steps} />
        </div>
    );
}
