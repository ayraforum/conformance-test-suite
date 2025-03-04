"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";


const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full bg-background text-primary shadow-md z-50">
    <div className="container mx-auto flex items-center justify-between p-4">
      {/* Logo and Title */}
      <div className="flex items-center space-x-4">
        <Link href="/">
          <img src="/gan-logo.svg" alt="Logo" className="h-8" />
        </Link>
        <span className="text font-semibold mt-1">Conformance Test Suite</span>
      </div>

      {/* Navigation Menu */}
      <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8 mt-1">
        <Link href="/systems" className="text-lg font-semibold text-primary hover:text-accentBlue">
          Systems
        </Link>
        <Link href="/test-harnesses" className="text-lg font-semibold text-primary hover:text-accentBlue">
          Test Harnesses
        </Link>
      </nav>

    </div>
  </header>

  );
};

export default Header;
