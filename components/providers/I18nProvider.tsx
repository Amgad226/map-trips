"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "@/public/locales/en/translation.json";
import arTranslations from "@/public/locales/ar/translation.json";

function getStoredLang(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("i18nextLng");
      if (stored === "ar" || stored === "en") return stored;
    } catch {
      // ignore
    }
  }
  return "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

function updateDirection(lng: string) {
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const storedLang = getStoredLang();
    if (storedLang !== i18n.language) {
      i18n.changeLanguage(storedLang);
    }
    updateDirection(i18n.language);

    const handleLanguageChanged = (lng: string) => {
      updateDirection(lng);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
