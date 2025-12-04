import Link from "next/link";

export default function HomePage() {
  const tests = [
    {
      id: "trust-registry",
      title: "Trust Registry Conformance",
      description:
        "Test if your ecocsystem and Trust Registry meets the required conformance standards.",
      path: "/registry",
    },
    {
      id: "holder",
      title: "Holder Conformance",
      description:
        "Test if a Holder Wallet implements the necessary capabilities for credential handling.",
      path: "/holder",
    },
    {
      id: "verifier",
      title: "Verifier Conformance",
      description:
        "Test if a Verifier properly implements presentation request and verification capabilities.",
      path: "/verifier",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-2">
          Ayra Conformance Test Suite
        </h1>
        <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
          A comprehensive suite of tests to verify conformance with Ayra Trust
          Registry and SSI standards.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={test.path}
              className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-300"
            >
              <h2 className="text-xl font-bold mb-2">{test.title}</h2>
              <p className="text-gray-600 mb-4">{test.description}</p>
              <div className="text-blue-500 font-medium">Run Test →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
