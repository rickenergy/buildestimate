"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { overrideDefaultPrice } from "@/app/actions/prices";
import { Plus, Search, ArrowLeft, ChevronRight } from "lucide-react";
import { TRADES } from "@/lib/types";
import type { PriceEntry } from "@/lib/takeoff/types";

export function PricesList({ prices }: { prices: PriceEntry[] }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [trade, setTrade] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PriceEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const tradeName = (tr: string) => t.trades[tr] ?? tr;
  const countFor = (tr: string) => prices.filter((p) => p.trade === tr).length;

  const tradePrices = prices
    .filter((p) => p.trade === trade)
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Short hover explanation built from the price breakdown.
  const explain = (p: PriceEntry) => {
    const parts: string[] = [];
    if (p.material_cost > 0) parts.push(`${t.estimate.material}: ${formatMoney(p.material_cost, lang)}`);
    if (p.labor_cost > 0) parts.push(`${t.estimate.labor}: ${formatMoney(p.labor_cost, lang)}`);
    return `${p.name} — ${parts.join(" · ")} / ${p.unit}`;
  };

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          {trade && (
            <button
              onClick={() => {
                setTrade(null);
                setQ("");
              }}
              className="press flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-label="back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="text-xl font-bold">{trade ? tradeName(trade) : t.prices.title}</h1>
        </div>
        {trade && (
          <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t.prices.add}
          </Button>
        )}
      </header>

      {!trade ? (
        /* ── Step 1: choose the service (translucent buttons) ── */
        <>
          <p className="text-center text-sm text-muted-foreground">{t.prices.hint}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TRADES.map((tr, i) => (
              <button
                key={tr}
                onClick={() => setTrade(tr)}
                style={{ ["--i" as string]: Math.min(i, 10) }}
                className="press animate-fade-up flex flex-col items-start gap-1 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-left backdrop-blur transition hover:border-primary/40 hover:bg-primary/10"
              >
                <span className="text-sm font-semibold capitalize">{tradeName(tr)}</span>
                <span className="text-xs text-muted-foreground">
                  {countFor(tr)} {lang === "pt" ? "itens" : lang === "es" ? "ítems" : "items"}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        /* ── Step 2: items of the chosen service ── */
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.prices.title} className="pl-9" />
          </div>

          <div className="flex flex-col gap-2">
            {tradePrices.map((p) => (
              <button
                key={`${p.trade}|${p.name}`}
                title={explain(p)}
                onClick={() => setEditing(p)}
                className="press group flex items-center justify-between gap-2 rounded-2xl border border-foreground/10 bg-card/70 px-4 py-3 text-left shadow-xs backdrop-blur hover:border-primary/30 hover:shadow-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      p.isUserPrice ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {p.isUserPrice ? t.prices.customPrice : t.prices.defaultPrice}
                  </span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-bold">
                    {formatMoney(p.material_cost + p.labor_cost, lang)}/{p.unit}
                  </span>
                  <span className="text-muted-foreground">
                    M {formatMoney(p.material_cost, lang)} · L {formatMoney(p.labor_cost, lang)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </button>
            ))}
            {tradePrices.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">—</p>
            )}
          </div>
        </>
      )}

      <PriceDialog
        open={adding || editing !== null}
        trade={trade ?? editing?.trade ?? ""}
        initial={editing ?? undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </main>
  );
}

function PriceDialog({
  open,
  trade,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  trade: string;
  initial?: PriceEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useDict();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", unit: "sqft", material: "0", labor: "0" });
  const [key, setKey] = useState("");

  const itemKey = initial ? `${initial.trade}|${initial.name}` : open ? "new" : "";
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      unit: initial?.unit ?? "sqft",
      material: String(initial?.material_cost ?? 0),
      labor: String(initial?.labor_cost ?? 0),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? t.common.edit : t.prices.add}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t.prices.item}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!!initial}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>{t.estimate.unit}</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.prices.materialCost}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.material}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.prices.laborCost}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.labor}
                onChange={(e) => setForm((f) => ({ ...f, labor: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={pending || !form.name.trim()}
            onClick={() =>
              startTransition(async () => {
                await overrideDefaultPrice({
                  trade,
                  name: form.name,
                  unit: form.unit,
                  material_cost: Number(form.material) || 0,
                  labor_cost: Number(form.labor) || 0,
                });
                onSaved();
              })
            }
          >
            {t.prices.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
