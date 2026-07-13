import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { enContent } from "@/content/en";
import { hiContent } from "@/content/hi";
import type { LandingContent } from "@/types";

type Lang = "hi" | "en";

const STORAGE_KEY = "smaran-landing-lang";

interface LanguageContextValue {
  lang: Lang;
  content: LandingContent;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") {
    return "hi";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "hi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const toggle = () => {
    setLang((current) => (current === "hi" ? "en" : "hi"));
  };

  const content = lang === "hi" ? hiContent : enContent;

  return (
    <LanguageContext.Provider value={{ lang, content, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
