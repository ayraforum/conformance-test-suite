import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/header";
import { Toaster } from "@/components/ui/toaster"
import QueryProvider from "@/providers/query-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Conformance Test Suite",
  description: "GAN Application for testing wallet conformance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >
          <QueryProvider>
            <Header />
            <main className="mt-20 container mx-auto px-4">{children}</main>
            <Toaster />
          </QueryProvider>
        </body>
    </html>
  );
}
