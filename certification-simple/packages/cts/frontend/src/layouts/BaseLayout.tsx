import "../app/globals.css";
import BaseHeader from "../components/BaseHeader";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BaseHeader />
      <main className="pt-4">
        {children}
      </main>
    </div>
  );
}
