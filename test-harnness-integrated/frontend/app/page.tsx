import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Code2, FileText, Shield, Workflow } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with Enhanced Background */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 text-center bg-gradient-to-br from-background via-blue-50 to-muted overflow-hidden">
        <div className="absolute inset-0 bg-grid-blue-500/[0.02] bg-[size:20px_20px]" />
        <div className="container max-w-4xl relative">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="Ayra Logo"
              width={140}
              height={140}
              className="animate-fade-in"
              priority
            />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
            Ayra Conformance Test Suite
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Streamlining interoperability testing for verifiable data systems
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            Validate your systems against Ayra API and Message Profiles
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/systems" className="gap-2">
                Start Testing Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="text-lg px-8 py-6 border-2"
            >
              <Link href="https://gan.foundation/" className="gap-2">
                Learn More About Ayra
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Overview Section */}
      <section className="py-12 px-4 bg-white/50 border-y">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              {
                count: "Open-Source",
                label: "Transparent Tooling",
                icon: Code2,
              },
              { count: "Real-time", label: "Test Monitoring", icon: Workflow },
              { count: "Detailed", label: "Test Reports", icon: FileText },
              { count: "Automated", label: "Certification", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <stat.icon className="h-8 w-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-700">
                  {stat.count}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image
                    src="/test-icon.svg"
                    alt="Test Icon"
                    width={24}
                    height={24}
                  />
                  Run Interoperability Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Validate your systems against Ayra technical profiles with
                  automated test suites and real-time feedback.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Pre-configured test profiles</li>
                  <li>• Real-time test execution</li>
                  <li>• Automated validation</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image
                    src="/results-icon.svg"
                    alt="Results Icon"
                    width={24}
                    height={24}
                  />
                  View Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get detailed conformance reports and actionable insights to
                  ensure your implementation meets standards.
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image
                    src="/cert-icon.svg"
                    alt="Certification Icon"
                    width={24}
                    height={24}
                  />
                  Prepare for Certification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ready your systems for formal certification within the Ayra
                  Trust Network ecosystem.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Use CTS Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">
                Why Use the Conformance Test Suite?
              </h2>
              <p className="text-lg text-muted-foreground">
                The Ayra Conformance Test Suite streamlines the process of
                validating your systems against established interoperability
                standards. Our automated testing tools support both
                message-centric and API-centric profiles, ensuring comprehensive
                coverage of your implementation.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full p-2 bg-blue-100">
                    <Shield className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Trusted Certification</h3>
                    <p className="text-muted-foreground">
                      Generate verifiable attestations of your system's
                      conformance.
                    </p>
                  </div>
                </div>
                {/* Add more benefit items */}
              </div>
            </div>
            <div className="relative aspect-square">
              <Image
                src="/workflow-diagram.svg"
                alt="CTS Workflow"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
