"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { addCatalogLine } from "@/app/actions/estimates";
import { BookOpen, Plus, Search, Loader2 } from "lucide-react";
import type { PriceEntry } from "@/lib/takeoff/types";

type Lang = "en" | "pt" | "es";

const L = {
  from: { en: "From catalog", pt: "Do catálogo", es: "Del catálogo" },
  title: { en: "Add from catalog", pt: "Adicionar do catálogo", es: "Agregar del catálogo" },
  search: { en: "Search service…", pt: "Buscar serviço…", es: "Buscar servicio…" },
  added: { en: "Added to estimate", pt: "Adicionado ao estimate", es: "Agregado" },
  qty: { en: "Qty", pt: "Qtd", es: "Cant" },
  empty: { en: "No match.", pt: "Nada encontrado.", es: "Sin resultados." },
} as const;

/** Pick a pre-priced service from the catalog and drop it into the estimate. */
export function CatalogPicker({
  estimateId,
  catalog,
}: {
  estimateId: string;
  catalog: PriceEntry[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? catalog.filter((c) => c.name.toLowerCase().includes(needle) || c.trade.toLowerCase().includes(needle))
      : catalog;
    return list.slice(0, 60);
  }, [catalog, q]);

  function add(entry: PriceEntry) {
    const n = Number(qty[`${entry.trade}|${entry.name}`]) || 1;
    startTransition(async () => {
      await addCatalogLine(
        estimateId,
        { name: entry.name, unit: entry.unit, material_cost: entry.material_cost, labor_cost: entry.labor_cost },
        n
      );
      toast.success(tr(L.added));
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BookOpen className="mr-1 h-4 w-4" /> {tr(L.from)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] max-w-md flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{tr(L.title)}</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr(L.search)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="-mx-2 flex-1 space-y-1 overflow-y-auto px-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
            ) : (
              filtered.map((c) => {
                const k = `${c.trade}|${c.name}`;
                const unitPrice = Number(c.material_cost) + Number(c.labor_cost);
                return (
                  <div key={k} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.trade} · {formatMoney(unitPrice, lang)}/{c.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={qty[k] ?? ""}
                      onChange={(e) => setQty((s) => ({ ...s, [k]: e.target.value }))}
                      placeholder={tr(L.qty)}
                      className="h-8 w-16 text-center text-sm"
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" disabled={pending} onClick={() => add(c)}>
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
