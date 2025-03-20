"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import Image from "next/image";

export default function BaseHeader() {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="fixed top-0 left-0 w-full bg-background text-primary shadow-md z-50">
            <div className="container mx-auto flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                    <Link href="/">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={32}
                            height={32}
                        />
                    </Link>
                    <span className="text font-semibold mt-1">
                        Conformance Test Suite
                    </span>
                </div>

                {/* Navigation Menu */}
                <nav className="absolute left-3/4 transform -translate-x-1/2 flex items-center space-x-8 mt-1">
                    <Link
                        href="/verifier"
                        className="text-lg font-semibold text-primary hover:text-accentBlue"
                    >
                        Test As Verifier
                    </Link>
                    <Link
                        href="/registry"
                        className="text-lg font-semibold text-primary hover:text-accentBlue"
                    >
                        Test As Trust Registry Provider
                    </Link>
                    <Link
                        href="/holder"
                        className="text-lg font-semibold text-primary hover:text-accentBlue"
                    >
                        Test As Holder
                    </Link>
                </nav>
            </div>
        </header>
    );
}
