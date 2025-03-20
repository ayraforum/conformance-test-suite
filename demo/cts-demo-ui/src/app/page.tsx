import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-center">
        How do you want to check Ayra Trust Network Compatibility?
      </h1>
      <div className="flex space-x-6">
        <div className="card w-64 h-64 flex items-center justify-center">
          <button className="btn btn-blue h-full">
            <Link href="/verifier">
              As a Verfier, check if I can verify Ayra Network Credentials if
              presented
            </Link>
          </button>
        </div>
        <div className="card w-64 h-64 flex items-center justify-center">
          <button className="btn btn-green h-full">
            <Link href="/present">
              As a Holder/Wallet System, present Ayra Network Credentials from a
              Wallet
            </Link>
          </button>
        </div>
        <div className="card w-64 h-64 flex items-center justify-center">
          <button className="btn btn-orange h-full">
            <Link href="/trust-registry">
              As a Trust Registry Provider, to test Ayra Network compatibility
            </Link>
          </button>
        </div>
      </div>
    </div>
  );
}
