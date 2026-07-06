const LOCALES: Record<string, string> = { en: "en-US", pt: "pt-BR", es: "es-US" };

export function formatMoney(n: number, lang = "en"): string {
  return new Intl.NumberFormat(LOCALES[lang] ?? "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number, lang = "en"): string {
  return new Intl.NumberFormat(LOCALES[lang] ?? "en-US", {
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date, lang = "en"): string {
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-US", {
    dateStyle: "medium",
  }).format(typeof d === "string" ? new Date(d) : d);
}
