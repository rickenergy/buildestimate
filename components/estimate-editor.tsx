"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { computeTotals } from "@/lib/takeoff/margin";
import {
  updateEstimateItem,
  deleteEstimateItem,
  addEstimateItem,
  updateEstimatePcts,
  updateEstimateStatus,
} from "@/app/actions/estimates";
import { ArrowLeft, Plus, Trash2, FileText, Users, CalendarDays, Ruler } from "lucide-react";
import { CatalogPicker } from "@/components/catalog-picker";
import { cn } from "@/lib/utils";
import type { Estimate, EstimateItem, ItemKind } from "@/lib/types";
import type { PriceEntry } from "@/lib/takeoff/types";

const SCORE_STYLES: Record<string, string> = {
  healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

interface Props {
  estimate: Estimate & { clients: { name: string } | null };
  items: EstimateItem[];
  minMarginPct: number;
  catalog: PriceEntry[];
}

export function EstimateEditor({ estimate, items, minMarginPct, catalog }: Props) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EstimateItem | null>(null);
  const [adding, setAdding] = useState(false);

  const totals = computeTotals(
    items.map((i) => ({
      kind: i.kind,
      description: i.description,
      qty: Number(i.qty),
      unit: i.unit,
      unit_cost: Number(i.unit_cost),
      total: Number(i.total),
      is_estimated_price: i.is_estimated_price,
    })),
    Number(estimate.overhead_pct),
    Number(estimate.profit_pct),
    Number(estimate.tax_pct),
    minMarginPct
  );

  const scoreLabel = {
    healthy: t.estimate.healthy,
    medium: t.estimate.medium,
    low: t.estimate.low,
  }[totals.margin_score];

  const groups: { label: string; kinds: ItemKind[] }[] = [
    { label: t.estimate.material, kinds: ["material"] },
    { label: t.estimate.labor, kinds: ["labor", "other"] },
    { label: t.estimate.demoDisposal, kinds: ["demo", "disposal"] },
  ];

  function refresh() {
    router.refresh();
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label={t.common.back}>
          <Link href="/estimates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{estimate.title}</h1>
          <p className="text-xs text-muted-foreground">
            {estimate.clients?.name ?? t.estimate.noClient} · <span className="capitalize">{estimate.trade}</span>
          </p>
        </div>
        <Select
          defaultValue={estimate.status}
          onValueChange={(v) => startTransition(() => updateEstimateStatus(estimate.id, v))}
        >
          <SelectTrigger className="w-28 text-xs" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["draft", "ready", "sent", "approved", "lost"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {t.estimate.status[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium", SCORE_STYLES[totals.margin_score])}>
        <span>
          {t.estimate.marginScore}: {scoreLabel}
        </span>
        <span>{totals.margin_pct}%</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {estimate.area_sqft && (
          <span className="flex items-center gap-1">
            <Ruler className="h-3 w-3" /> {Number(estimate.area_sqft)} sqft
          </span>
        )}
        {estimate.crew_size && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {estimate.crew_size} {t.estimate.people}
          </span>
        )}
        {estimate.est_days && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {Number(estimate.est_days)} {t.estimate.days}
          </span>
        )}
      </div>

      {groups.map(({ label, kinds }) => {
        const groupItems = items.filter((i) => kinds.includes(i.kind));
        if (groupItems.length === 0) return null;
        return (
          <section key={label}>
            <h2 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</h2>
            <Card>
              <CardContent className="divide-y p-0">
                {groupItems.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm active:bg-accent"
                    onClick={() => setEditing(item)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {item.description}
                      {item.is_estimated_price && (
                        <Badge variant="outline" className="ml-1 px-1 py-0 text-[9px] text-amber-600">
                          {t.estimate.estimatedPrice}
                        </Badge>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {Number(item.qty)} {item.unit} × {formatMoney(Number(item.unit_cost), lang)}
                    </span>
                    <span className="w-20 text-right font-medium">
                      {formatMoney(Number(item.total), lang)}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>
        );
      })}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> {t.estimate.addItem}
        </Button>
        <CatalogPicker estimateId={estimate.id} catalog={catalog} />
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.estimate.subtotal}</span>
            <span>{formatMoney(totals.subtotal, lang)}</span>
          </div>
          <PctRow
            label={t.estimate.overhead}
            pct={Number(estimate.overhead_pct)}
            amount={formatMoney(totals.overhead_amount, lang)}
            onChange={(v) => startTransition(() => updateEstimatePcts(estimate.id, { overhead_pct: v }))}
          />
          <PctRow
            label={t.estimate.profit}
            pct={Number(estimate.profit_pct)}
            amount={formatMoney(totals.profit_amount, lang)}
            onChange={(v) => startTransition(() => updateEstimatePcts(estimate.id, { profit_pct: v }))}
          />
          <PctRow
            label={t.estimate.tax}
            pct={Number(estimate.tax_pct)}
            amount={formatMoney(totals.tax_amount, lang)}
            onChange={(v) => startTransition(() => updateEstimatePcts(estimate.id, { tax_pct: v }))}
          />
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t.estimate.total}</span>
            <span>{formatMoney(totals.total, lang)}</span>
          </div>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="h-12" disabled={pending}>
        <Link href={`/estimate/${estimate.id}/proposal`}>
          <FileText className="mr-1 h-5 w-5" /> {t.estimate.generateProposal}
        </Link>
      </Button>

      {/* Edit item dialog */}
      <ItemDialog
        open={editing !== null}
        title={t.common.edit}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onDelete={
          editing
            ? () =>
                startTransition(async () => {
                  await deleteEstimateItem(estimate.id, editing.id);
                  setEditing(null);
                  refresh();
                })
            : undefined
        }
        onSave={(fields) =>
          startTransition(async () => {
            if (editing) {
              await updateEstimateItem(estimate.id, editing.id, fields);
              setEditing(null);
              refresh();
            }
          })
        }
      />

      {/* Add item dialog */}
      <ItemDialog
        open={adding}
        title={t.estimate.addItem}
        onClose={() => setAdding(false)}
        onSave={(fields) =>
          startTransition(async () => {
            await addEstimateItem(estimate.id, {
              kind: "other",
              description: fields.description ?? "",
              qty: fields.qty ?? 1,
              unit: "ea",
              unit_cost: fields.unit_cost ?? 0,
            });
            setAdding(false);
            refresh();
          })
        }
      />
    </main>
  );
}

function PctRow({
  label,
  pct,
  amount,
  onChange,
}: {
  label: string;
  pct: number;
  amount: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-muted-foreground">
      <span className="flex-1">{label}</span>
      <span className="flex items-center gap-1">
        <Input
          type="number"
          defaultValue={pct}
          step="0.5"
          min="0"
          className="h-7 w-16 text-right text-xs"
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v) && v !== pct) onChange(v);
          }}
        />
        %
      </span>
      <span className="w-20 text-right">{amount}</span>
    </div>
  );
}

function ItemDialog({
  open,
  title,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  title: string;
  initial?: EstimateItem;
  onClose: () => void;
  onSave: (fields: { description?: string; qty?: number; unit_cost?: number }) => void;
  onDelete?: () => void;
}) {
  const t = useDict();
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [key, setKey] = useState("");

  // Sync form when a different item opens
  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setDescription(initial?.description ?? "");
    setQty(String(initial?.qty ?? 1));
    setUnitCost(String(initial?.unit_cost ?? 0));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t.estimate.description}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t.estimate.qty}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.estimate.unitCost}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2">
          {onDelete && (
            <Button variant="destructive" size="icon" onClick={onDelete} aria-label={t.common.delete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() =>
              onSave({
                description,
                qty: Number(qty) || 1,
                unit_cost: Number(unitCost) || 0,
              })
            }
          >
            {t.clients.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
