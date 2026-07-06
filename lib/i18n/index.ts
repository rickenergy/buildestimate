import { en, type Dict } from "./en";
import { pt } from "./pt";
import { es } from "./es";
import type { Language } from "@/lib/types";

export type { Dict };

const dicts: Record<Language, Dict> = { en, pt, es };

export function getDict(lang: string | null | undefined): Dict {
  if (lang === "pt" || lang === "es") return dicts[lang];
  return en;
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
];
