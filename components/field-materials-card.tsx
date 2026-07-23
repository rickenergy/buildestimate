"use client";

import { useMemo, useState, useTransition } from "react";
import { HardHat, Minus, Plus, TriangleAlert, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { formatNumber } from "@/lib/format";
import { materialTakeoff } from "@/lib/takeoff/materials";
import { saveMaterialProgress, type MaterialProgress } from "@/app/actions/estimates";
import type { EstimateItem } from "@/lib/types";

const L = {
  title: { en: "Field materials", pt: "Material no campo", es: "Material en obra" },
  hint: {
    en: "Track what arrived on site and what's installed. Updates the job's completion live.",
    pt: "Acompanhe o que chegou na obra e o que foi instalado. Atualiza a conclusão da obra ao vivo.",
    es: "Controle lo que llegó a la obra y lo instalado. Actualiza el avance en vivo.",
  },
  installed: { en: "Installed", pt: "Instalado", es: "Instalado" },
  received: { en: "On site", pt: "Na obra", es: "En obra" },
  need: { en: "need", pt: "precisa", es: "necesita" },
  complete: { en: "installed", pt: "instalado", es: "instalado" },
  overWarn: { en: "installed exceeds what's on site", pt: "instalado passou do que chegou", es: "instalado supera lo recibido" },
  empty: { en: "No material to track on this job.", pt: "Sem material para acompanhar nesta obra.", es: "Sin material para controlar." },
};

interface Line {
  key: string;
  description: string;
  target: number; // in the purchasable unit (or base qty)
  unitLabel: string;
}

function barColor(ratio: number): string {
  if (ratio >= 1) return "bg-emerald-500";
  if (ratio > 0) return "bg-amber-500";
  return "bg-rose-400";
}

export function FieldMaterialsCard({
  estimateId,
  items,
  tracking,
}: {
  estimateId: string;
  items: EstimateItem[];
  tracking: Record<string, MaterialProgress>;
}) {
  const lang = useLang();
  const tr = (m: Record<string, string>) => m[lang] ?? m.en;
  const [, startTransition] = useTransition();

  const lines: Line[] = useMemo(() => {
    const coerced = items.map((i) => ({ ...i, qty: Number(i.qty), total: Number(i.total), unit_cost: Number(i.unit_cost) }));
    return materialTakeoff(coerced).map((l) => ({
      key: `${l.description}__${l.unit}`,
      description: l.description,
      target: l.purchase ? l.purchase.packs : Math.round(l.qty),
      unitLabel: l.purchase ? l.purchase.packLabel : l.unit,
    }));
  }, [items]);

  const [prog, setProg] = useState<Record<string, MaterialProgress>>(() => {
    const base: Record<string, MaterialProgress> = {};
    for (const l of lines) base[l.key] = tracking[l.key] ?? { received: 0, installed: 0 };
    return base;
  });

  const totals = useMemo(() => {
    let target = 0;
    let installed = 0;
    let received = 0;
    for (const l of lines) {
      target += l.target;
      installed += Math.min(prog[l.key]?.installed ?? 0, l.target);
      received += Math.min(prog[l.key]?.received ?? 0, l.target);
    }
    return {
      target,
      installedPct: target > 0 ? Math.round((installed / target) * 100) : 0,
      receivedPct: target > 0 ? Math.round((received / target) * 100) : 0,
    };
  }, [lines, prog]);

  function update(key: string, field: keyof MaterialProgress, value: number) {
    const next = { ...(prog[key] ?? { received: 0, installed: 0 }), [field]: Math.max(0, value) };
    setProg((p) => ({ ...p, [key]: next }));
    startTransition(async () => {
      await saveMaterialProgress(estimateId, key, { [field]: next[field] });
    });
  }

  if (lines.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <HardHat className="h-4 w-4 text-primary" /> {tr(L.title)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{tr(L.empty)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <HardHat className="h-4 w-4 text-primary" /> {tr(L.title)}
          </p>
          <p className="text-xs text-muted-foreground">{tr(L.hint)}</p>
        </div>

        {/* Overall completion */}
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-end justify-between">
            <span className="text-xs text-muted-foreground">{tr(L.complete)}</span>
            <span className="text-2xl font-bold tabular-nums">{totals.installedPct}%</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all ${barColor(totals.installedPct / 100)}`} style={{ width: `${totals.installedPct}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> {tr(L.received)} {totals.receivedPct}%
          </div>
        </div>

        {/* Per-material rows */}
        <ul className="grid gap-3">
          {lines.map((l) => {
            const pr = prog[l.key] ?? { received: 0, installed: 0 };
            const iRatio = l.target > 0 ? pr.installed / l.target : 0;
            const rRatio = l.target > 0 ? pr.received / l.target : 0;
            const over = pr.installed > pr.received;
            return (
              <li key={l.key} className="grid gap-1.5 border-b pb-3 last:border-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.description}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {l.target} {l.unitLabel} {tr(L.need)}
                  </span>
                </div>

                {/* installed bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all ${barColor(iRatio)}`} style={{ width: `${Math.min(100, iRatio * 100)}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Stepper
                    label={tr(L.received)}
                    value={pr.received}
                    max={l.target}
                    tone="sky"
                    ratio={rRatio}
                    onChange={(v) => update(l.key, "received", v)}
                  />
                  <Stepper
                    label={tr(L.installed)}
                    value={pr.installed}
                    max={l.target}
                    tone="emerald"
                    ratio={iRatio}
                    onChange={(v) => update(l.key, "installed", v)}
                  />
                </div>

                {over && (
                  <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                    <TriangleAlert className="h-3.5 w-3.5" /> {tr(L.overWarn)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stepper({
  label,
  value,
  max,
  ratio,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  ratio: number;
  tone: "sky" | "emerald";
  onChange: (v: number) => void;
}) {
  const lang = useLang();
  const done = ratio >= 1;
  const dot = tone === "sky" ? "bg-sky-500" : "bg-emerald-500";
  const step = max > 40 ? Math.max(1, Math.round(max / 20)) : 1;
  return (
    <div className="rounded-lg border p-2">
      <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} /> {label}
        {done && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - step))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border active:scale-95"
          aria-label="minus"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold tabular-nums">{formatNumber(value, lang)}</span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border active:scale-95"
          aria-label="plus"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
