"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { formatMoney, formatNumber } from "@/lib/format";
import { materialTakeoff, materialVsLabor } from "@/lib/takeoff/materials";
import { computeTotals } from "@/lib/takeoff/margin";
import { setEstimateMaterialsIncluded } from "@/app/actions/estimates";
import type { EstimateItem } from "@/lib/types";

export interface MaterialMode {
  estimateId: string;
  materialsIncluded: boolean;
  overheadPct: number;
  profitPct: number;
  taxPct: number;
  minMarginPct: number;
}

const L = {
  title: { en: "Materials — shopping list", pt: "Materiais — lista de compra", es: "Materiales — lista de compra" },
  hint: {
    en: "Quantities to order for this job. Coverage is a rule of thumb — verify before purchase.",
    pt: "Quantidades a pedir para esta obra. Cobertura é estimativa — confira antes de comprar.",
    es: "Cantidades a pedir para esta obra. La cobertura es aproximada — verifique antes de comprar.",
  },
  material: { en: "Material", pt: "Material", es: "Material" },
  labor: { en: "Labor & other", pt: "Mão de obra & outros", es: "Mano de obra & otros" },
  buy: { en: "to buy", pt: "comprar", es: "comprar" },
  empty: { en: "No material lines in this estimate.", pt: "Sem linhas de material neste orçamento.", es: "Sin líneas de material en este presupuesto." },
  priceMode: { en: "Client price", pt: "Preço ao cliente", es: "Precio al cliente" },
  withMat: { en: "With material", pt: "Com material", es: "Con material" },
  laborOnly: { en: "Labor only", pt: "Só mão de obra", es: "Solo mano de obra" },
  modeHint: {
    en: "Pick which price the client sees. Labor-only = client buys the material.",
    pt: "Escolha o preço que o cliente vê. Só mão de obra = cliente compra o material.",
    es: "Elija el precio que ve el cliente. Solo mano de obra = el cliente compra el material.",
  },
};

export function MaterialsCard({ items, mode }: { items: EstimateItem[]; mode?: MaterialMode }) {
  const lang = useLang();
  const tr = (m: Record<string, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  const { list, split, coerced } = useMemo(() => {
    // Supabase returns numeric columns as strings — coerce before math.
    const coerced = items.map((i) => ({ ...i, qty: Number(i.qty), total: Number(i.total), unit_cost: Number(i.unit_cost) }));
    return { list: materialTakeoff(coerced), split: materialVsLabor(coerced), coerced };
  }, [items]);

  // Client-facing totals: full vs labor-only (material excluded), same margin math.
  const totals = useMemo(() => {
    if (!mode) return null;
    const pct = [mode.overheadPct, mode.profitPct, mode.taxPct, mode.minMarginPct] as const;
    const withMat = computeTotals(coerced, ...pct).total;
    const laborOnly = computeTotals(coerced.filter((i) => i.kind !== "material"), ...pct).total;
    return { withMat, laborOnly };
  }, [coerced, mode]);

  function setIncluded(included: boolean) {
    if (!mode || included === mode.materialsIncluded) return;
    startTransition(async () => {
      await setEstimateMaterialsIncluded(mode.estimateId, included);
      router.refresh();
    });
  }

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-primary" /> {tr(L.title)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{tr(L.empty)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-primary" /> {tr(L.title)}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Material vs labor split — powers the "with / without material" view */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">{tr(L.material)}</p>
            <p className="font-semibold tabular-nums">{formatMoney(split.material, lang)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">{tr(L.labor)}</p>
            <p className="font-semibold tabular-nums">{formatMoney(split.labor, lang)}</p>
          </div>
        </div>

        {/* Client price mode — with material vs labor-only (single estimate only) */}
        {mode && totals && (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium">{tr(L.priceMode)}</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { on: true, label: tr(L.withMat), value: totals.withMat },
                  { on: false, label: tr(L.laborOnly), value: totals.laborOnly },
                ] as const
              ).map((opt) => {
                const active = mode.materialsIncluded === opt.on;
                return (
                  <button
                    key={String(opt.on)}
                    type="button"
                    disabled={pending}
                    onClick={() => setIncluded(opt.on)}
                    className={`rounded-lg border px-3 py-2 text-left transition disabled:opacity-60 ${
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="block text-xs text-muted-foreground">{opt.label}</span>
                    <span className="block font-semibold tabular-nums">{formatMoney(opt.value, lang)}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{tr(L.modeHint)}</p>
          </div>
        )}

        {open && (
          <>
            <p className="text-xs text-muted-foreground">{tr(L.hint)}</p>
            <ul className="grid gap-1.5">
              {list.map((l, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.description}</span>
                    {l.purchase && (
                      <span className="text-xs text-muted-foreground">{l.purchase.coverageNote}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    {l.purchase ? (
                      <>
                        <span className="font-semibold tabular-nums">{l.purchase.packs}</span>{" "}
                        <span className="text-xs text-muted-foreground">{l.purchase.packLabel}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {formatNumber(l.qty, lang)} {l.unit}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold tabular-nums">
                        {formatNumber(l.qty, lang)} <span className="text-xs font-normal text-muted-foreground">{l.unit}</span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
