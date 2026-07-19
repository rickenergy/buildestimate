"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Map, ChevronRight, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { APP_MAP } from "@/lib/app-map";
import {
  GLOSSARY,
  GUIDE_UI,
  type GlossaryCategory,
  type GLang,
} from "@/lib/glossary";

const ORDER: GlossaryCategory[] = ["metrics", "status", "money", "work", "sections"];

const MAP_L: Record<GLang, { map: string; glossary: string }> = {
  en: { map: "Map of the app", glossary: "Glossary" },
  pt: { map: "Mapa do app", glossary: "Glossário" },
  es: { map: "Mapa de la app", glossary: "Glosario" },
};

export function GuideView({ lang }: { lang: GLang }) {
  const ui = GUIDE_UI[lang];
  const ml = MAP_L[lang] ?? MAP_L.en;
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const filteredMap = useMemo(() => {
    if (!needle) return APP_MAP;
    return APP_MAP.map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.title[lang]} ${i.desc[lang]}`.toLowerCase().includes(needle)
      ),
    })).filter((g) => g.items.length > 0);
  }, [needle, lang]);

  const filtered = useMemo(() => {
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter((e) => {
      const hay = [e.term[lang], e.short[lang], e.long?.[lang] ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [needle, lang]);

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

      {/* Map of the app — where everything lives */}
      {filteredMap.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Map className="h-3.5 w-3.5" /> {ml.map}
          </h2>
          {filteredMap.map((g) => (
            <div key={g.id}>
              <p className="mb-1.5 px-0.5 text-sm font-semibold">{g.title[lang]}</p>
              <div className="divide-y rounded-lg border">
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="press flex items-center gap-3 p-3 transition hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.title[lang]}</p>
                      <p className="text-xs text-muted-foreground">{i.desc[lang]}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Glossary */}
      {groups.length > 0 && (
        <h2 className="flex items-center gap-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> {ml.glossary}
        </h2>
      )}
      {groups.length === 0 && filteredMap.length === 0 ? (
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
