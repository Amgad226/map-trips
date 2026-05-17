"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 shrink-0">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
        <Link href="/" className="text-xl font-bold text-gray-900 tracking-tight">
          Travel Map
        </Link>

        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Map
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Admin
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="sm:hidden pb-4 space-y-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Map
          </Link>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-gray-50"
          >
            Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
