"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { makeTerms, translate, type Locale, type Terms } from "@/lib/dictionaries";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  terms: Terms;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app-locale");
    if (saved === "hi" || saved === "en") setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        localStorage.setItem("app-locale", l);
      },
      t: (key, vars) => translate(locale, key, vars),
      terms: makeTerms(locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
