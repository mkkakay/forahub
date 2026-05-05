"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "fr" | "ar" | "es" | "pt" | "sw" | "hi" | "id";

export const LANGUAGES: Record<Lang, { native: string; label: string; rtl?: boolean }> = {
  en: { native: "English", label: "EN" },
  fr: { native: "Français", label: "FR" },
  ar: { native: "العربية", label: "AR", rtl: true },
  es: { native: "Español", label: "ES" },
  pt: { native: "Português", label: "PT" },
  sw: { native: "Kiswahili", label: "SW" },
  hi: { native: "हिन्दी", label: "HI" },
  id: { native: "Bahasa Indonesia", label: "ID" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {}, isRTL: false });

function detectBrowserLang(): Lang {
  if (typeof window === "undefined") return "en";
  const bl = navigator.language.split("-")[0] as Lang;
  return Object.keys(LANGUAGES).includes(bl) ? bl : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("forahub-lang") as Lang | null;
    const resolved = saved && Object.keys(LANGUAGES).includes(saved) ? saved : detectBrowserLang();
    applyLang(resolved);
    setLangState(resolved);
  }, []);

  function applyLang(l: Lang) {
    document.documentElement.lang = l;
    document.documentElement.dir = LANGUAGES[l].rtl ? "rtl" : "ltr";
  }

  function setLang(l: Lang) {
    applyLang(l);
    setLangState(l);
    localStorage.setItem("forahub-lang", l);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRTL: !!LANGUAGES[lang].rtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
