"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  GLOSSARY,
  GUIDE_UI,
  type GlossaryCategory,
  type GLang,
} from "@/lib/glossary";

const ORDER: GlossaryCategory[] = ["metrics", "status", "money", "work", "sections"];

export function GuideView({ lang }: { lang: GLang }) {
  const ui = GUIDE_UI[lang];
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter((e) => {
      const hay = [e.term[lang], e.short[lang], e.long?.[lang] ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, lang]);

  const groups = ORDER.map((cat) => ({
    cat,
    entries: filtered.filter((e) => e.category === cat),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <header className="space-y-1 animate-fade-up">
        <h1 className="text-xl font-bold">{ui.title}</h1>
        <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ui.search}
          className="pl-9"
          autoFocus
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{ui.empty}</p>
      ) : (
        groups.map(({ cat, entries }) => (
          <section key={cat} className="space-y-2">
            <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.categories[cat]}
            </h2>
            <div className="divide-y rounded-lg border">
              {entries.map((e) => (
                <div key={e.id} className="p-3">
                  <p className="text-sm font-semibold">{e.term[lang]}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{e.short[lang]}</p>
                  {e.long && (
                    <p className="mt-1 text-xs text-muted-foreground">{e.long[lang]}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
