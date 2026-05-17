"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const toggleLang = () => {
    const next = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
  };

  return (
    <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 shrink-0 backdrop-blur-xl bg-opacity-80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
        <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
          {t("nav.brand")}
        </Link>

        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
          >
            {t("nav.map")}
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-primary hover:text-primary/90 transition-colors px-3 py-2 rounded-lg hover:bg-primary/10"
          >
            {t("nav.admin")}
          </Link>
          <button
            onClick={toggleLang}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
          >
            {i18n.language === "ar" ? "English" : "العربية"}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={resolvedTheme === "dark" ? t("theme.light") : t("theme.dark")}
          >
            {resolvedTheme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted"
          aria-label={t("nav.toggleMenu")}
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
        <div className="sm:hidden pb-4 space-y-1">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {t("nav.map")}
          </Link>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10"
          >
            {t("nav.admin")}
          </Link>
          <button
            onClick={() => { toggleLang(); setOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {i18n.language === "ar" ? "English" : "العربية"}
          </button>
          <button
            onClick={() => { toggleTheme(); setOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {resolvedTheme === "dark" ? t("theme.light") : t("theme.dark")}
          </button>
        </div>
      )}
    </nav>
  );
}
