import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function BaseHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <header className="bg-white text-gray-800 shadow-md">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/" className="flex items-center">
                            <div className="relative w-10 h-10">
                                <Image
                                    src="/logo.svg"
                                    alt="Ayra CTS Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <span className="ml-2 text-xl font-bold text-gray-800 hidden sm:inline">
                                Ayra{" "}
                                <span className="text-blue-600">
                                    Conformance Test Suite
                                </span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            href="/holder"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Holder
                        </Link>
                        <Link
                            href="/verifier"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            Verifier
                        </Link>
                        <Link
                            href="/trqp"
                            className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                        >
                            TRQP
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden rounded-md p-2 text-gray-700 hover:text-blue-600 focus:outline-none"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isMobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMobileMenuOpen && (
                    <nav className="md:hidden mt-3 pt-3 border-t border-gray-200">
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/"
                                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/holder"
                                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Holder
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/verifier"
                                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Verifier
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/trqp"
                                    className="block text-gray-700 hover:text-blue-600 font-medium transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    TRQP
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
}
