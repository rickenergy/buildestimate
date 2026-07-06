"use client";

import { createContext, useContext } from "react";
import type { Dict } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface I18nValue {
  dict: Dict;
  lang: Language;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  dict,
  lang,
  children,
}: I18nValue & { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ dict, lang }}>{children}</I18nContext.Provider>
  );
}

export function useDict(): Dict {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useDict must be used within I18nProvider");
  return ctx.dict;
}

export function useLang(): Language {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLang must be used within I18nProvider");
  return ctx.lang;
}
