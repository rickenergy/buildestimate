"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { overrideDefaultPrice } from "@/app/actions/prices";
import { Plus } from "lucide-react";
import { TRADES } from "@/lib/types";
import type { PriceEntry } from "@/lib/takeoff/types";

export function PricesList({ prices }: { prices: PriceEntry[] }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [trade, setTrade] = useState<string>("flooring");
  const [editing, setEditing] = useState<PriceEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const tradePrices = prices
    .filter((p) => p.trade === trade)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <h1 className="text-xl font-bold">{t.prices.title}</h1>
        <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> {t.prices.add}
        </Button>
      </header>

      <p className="text-xs text-muted-foreground">{t.prices.hint}</p>

      <Tabs value={trade} onValueChange={setTrade}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {TRADES.map((tr) => (
            <TabsTrigger key={tr} value={tr} className="capitalize">
              {tr}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="divide-y p-0">
          {tradePrices.map((p) => (
            <button
              key={`${p.trade}|${p.name}`}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm active:bg-accent"
              onClick={() => setEditing(p)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{p.name}</span>
                <Badge
                  variant="outline"
                  className={`px-1 py-0 text-[9px] ${p.isUserPrice ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {p.isUserPrice ? t.prices.customPrice : t.prices.defaultPrice}
                </Badge>
              </span>
              <span className="text-right text-xs">
                <span className="block font-medium">
                  {formatMoney(p.material_cost + p.labor_cost, lang)}/{p.unit}
                </span>
                <span className="text-muted-foreground">
                  M {formatMoney(p.material_cost, lang)} · L {formatMoney(p.labor_cost, lang)}
                </span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <PriceDialog
        open={adding || editing !== null}
        trade={trade}
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
