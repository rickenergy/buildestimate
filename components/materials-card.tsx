"use client";

import { useMemo, useState } from "react";
import { Package, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { formatMoney, formatNumber } from "@/lib/format";
import { materialTakeoff, materialVsLabor } from "@/lib/takeoff/materials";
import type { EstimateItem } from "@/lib/types";

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
};

export function MaterialsCard({ items }: { items: EstimateItem[] }) {
  const lang = useLang();
  const tr = (m: Record<string, string>) => m[lang] ?? m.en;
  const [open, setOpen] = useState(true);

  const { list, split } = useMemo(() => {
    // Supabase returns numeric columns as strings — coerce before math.
    const coerced = items.map((i) => ({ ...i, qty: Number(i.qty), total: Number(i.total), unit_cost: Number(i.unit_cost) }));
    return { list: materialTakeoff(coerced), split: materialVsLabor(coerced) };
  }, [items]);

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
