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
      <div className="container mx-auto flex items-center p-4">
        <Link href="/" className="absolute left-4">
          <img src="/next.svg" alt="Logo" className="h-8" />
        </Link>
        <nav className="flex items-center space-x-8 mx-auto">
          <Link href="/" className="text-lg font-semibold text-primary hover:text-accentBlue">
            Dashboard
          </Link>
          <div className="border-l border-gray-300 h-6"></div>
          <Link href="/systems" className="text-lg font-semibold text-primary hover:text-accentBlue">
            Systems
          </Link>
          <div className="border-l border-gray-300 h-6"></div>
          <Link href="/run" className="text-lg font-semibold text-primary hover:text-accentBlue">
            Run Profile Test
          </Link>
          <div className="border-l border-gray-300 h-6"></div>
          <Link href="/history" className="text-lg font-semibold text-primary hover:text-accentBlue">
            Test History
          </Link>
        </nav>

        {/* User Dropdown */}
        <div className="absolute right-4" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 text-gray-800 hover:text-accentBlue"
          >
            <div className="w-8 h-8 rounded-full border-2 border-pink-500 flex items-center justify-center">
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
              >
                <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/>
              </svg>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
              <Link href="/profile" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">
                Profile
              </Link>
              <Link href="/settings" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">
                Settings
              </Link>
              <hr className="my-1" />
              <button
                onClick={() => console.log('Logout clicked')}
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
