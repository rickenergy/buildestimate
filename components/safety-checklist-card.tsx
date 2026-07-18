"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { getSafetyChecklist } from "@/lib/safety";
import { toggleSafetyCheck } from "@/app/actions/safety";
import { ShieldCheck, Check } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Safety checklist", pt: "Checklist de segurança", es: "Lista de seguridad" },
  subtitle: {
    en: "Confirm each item before and during the job.",
    pt: "Confirme cada item antes e durante a obra.",
    es: "Confirma cada punto antes y durante la obra.",
  },
  done: { en: "done", pt: "concluído", es: "hecho" },
} as const;

export function SafetyChecklistCard({
  trade,
  estimateId,
  initialDone,
}: {
  trade: string;
  estimateId: string;
  initialDone: string[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set(initialDone));

  const items = getSafetyChecklist(trade);
  const doneCount = items.filter((i) => done.has(i.key)).length;

  function toggle(key: string) {
    const next = new Set(done);
    const willBeDone = !next.has(key);
    if (willBeDone) next.add(key);
    else next.delete(key);
    setDone(next); // optimistic
    startTransition(async () => {
      await toggleSafetyCheck(estimateId, key, willBeDone);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {tr(L.title)}
          </CardTitle>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {doneCount}/{items.length} {tr(L.done)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {items.map((item) => {
          const isDone = done.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              disabled={pending}
              onClick={() => toggle(item.key)}
              className={
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition " +
                (isDone ? "border-emerald-500/40 bg-emerald-500/5" : "hover:bg-muted")
              }
            >
              <span
                className={
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border " +
                  (isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40")
                }
              >
                {isDone && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className={isDone ? "text-muted-foreground line-through" : ""}>
                {tr(item.label)}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
