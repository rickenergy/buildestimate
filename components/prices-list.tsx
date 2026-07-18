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
import { overrideDefaultPrice, approvePriceItem } from "@/app/actions/prices";
import { Plus, Search, ArrowLeft, ChevronRight, Clock, Check } from "lucide-react";
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
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [, startApprove] = useTransition();

  /** Item already exists somewhere — jump there and pulse-highlight it instead of creating a dupe. */
  function jumpToDuplicate(entry: PriceEntry) {
    setAdding(false);
    setTrade(entry.trade);
    setQ("");
    const key = `${entry.trade}|${entry.name}`;
    setHighlightKey(key);
    requestAnimationFrame(() => {
      document.getElementById(`price-row-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setTimeout(() => setHighlightKey(null), 2500);
  }

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
            {tradePrices.map((p) => {
              const rowKey = `${p.trade}|${p.name}`;
              const pending = p.status === "pending";
              return (
              <div
                key={rowKey}
                id={`price-row-${rowKey}`}
                className={`group flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-xs backdrop-blur transition-colors duration-500 ${
                  highlightKey === rowKey
                    ? "border-primary/50 bg-primary/15"
                    : pending
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-foreground/10 bg-card/70"
                }`}
              >
                <button
                  title={explain(p)}
                  onClick={() => setEditing(p)}
                  className="press flex min-w-0 flex-1 items-center justify-between gap-2 text-left hover:opacity-80"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
                        pending ? "text-amber-600 dark:text-amber-400" : p.isUserPrice ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {pending && <Clock className="h-2.5 w-2.5" />}
                      {pending ? t.prices.pendingApproval : p.isUserPrice ? t.prices.customPrice : t.prices.defaultPrice}
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
                </button>
                {pending && p.id ? (
                  <button
                    title={t.prices.approve}
                    onClick={() => startApprove(async () => { await approvePriceItem(p.id!); router.refresh(); })}
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </div>
              );
            })}
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
        allPrices={prices}
        onDuplicate={jumpToDuplicate}
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
  allPrices,
  onDuplicate,
  onClose,
  onSaved,
}: {
  open: boolean;
  trade: string;
  initial?: PriceEntry;
  allPrices: PriceEntry[];
  onDuplicate: (entry: PriceEntry) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useDict();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", unit: "sqft", material: "0", labor: "0" });
  const [dupWarning, setDupWarning] = useState<PriceEntry | null>(null);
  const [key, setKey] = useState("");

  const itemKey = initial ? `${initial.trade}|${initial.name}` : open ? "new" : "";
  if (itemKey !== key) {
    setKey(itemKey);
    setDupWarning(null);
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
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name }));
                if (!initial && name.trim().length > 2) {
                  const match = allPrices.find(
                    (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
                  );
                  setDupWarning(match ?? null);
                } else {
                  setDupWarning(null);
                }
              }}
              disabled={!!initial}
            />
            {dupWarning && (
              <button
                type="button"
                onClick={() => onDuplicate(dupWarning)}
                className="mt-1 rounded-lg bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-700 underline decoration-dotted dark:text-amber-400"
              >
                {t.prices.dupWarning.replace("{trade}", t.trades[dupWarning.trade] ?? dupWarning.trade)}
              </button>
            )}
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
            disabled={pending || !form.name.trim() || !!dupWarning}
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
