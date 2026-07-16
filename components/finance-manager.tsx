"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { deleteTransaction } from "@/app/actions/finance";
import {
  LOSS_DISPOSITIONS,
  type Disposition,
  type JobTransaction,
} from "@/lib/finance";
import { TransactionCadastro } from "@/components/transaction-cadastro";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Plus,
  Recycle,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  transactions: JobTransaction[];
  estimates: { id: string; title: string }[];
  mediaUrls?: Record<string, string>;
}

type Lang = "en" | "pt" | "es";

const M = {
  wasteTitle: { en: "Waste & loss", pt: "Desperdício & perdas", es: "Desperdicio y pérdidas" },
  lost: { en: "Lost value", pt: "Valor perdido", es: "Valor perdido" },
  returned: { en: "Returned", pt: "Devolvido", es: "Devuelto" },
  reused: { en: "Reused", pt: "Reaproveitado", es: "Reutilizado" },
  wasteRate: { en: "Waste rate", pt: "Taxa de desperdício", es: "Tasa de desperdicio" },
  ofSpend: { en: "of spend", pt: "do gasto", es: "del gasto" },
  byJob: { en: "Loss by job", pt: "Perda por trabalho", es: "Pérdida por trabajo" },
  invoice: { en: "Invoice", pt: "Nota", es: "Factura" },
} as const;

const DISP_BADGE: Record<Disposition, { label: Record<Lang, string>; cls: string }> = {
  used: { label: { en: "used", pt: "usado", es: "usado" }, cls: "" },
  wasted: { label: { en: "wasted", pt: "desperdício", es: "desperdicio" }, cls: "bg-rose-500/15 text-rose-600" },
  returned: { label: { en: "returned", pt: "devolvido", es: "devuelto" }, cls: "bg-blue-500/15 text-blue-600" },
  reused: { label: { en: "reused", pt: "reaproveitado", es: "reutilizado" }, cls: "bg-emerald-500/15 text-emerald-600" },
  broken: { label: { en: "broken", pt: "quebrado", es: "roto" }, cls: "bg-rose-500/15 text-rose-600" },
  lost: { label: { en: "lost", pt: "perdido", es: "perdido" }, cls: "bg-rose-500/15 text-rose-600" },
};

export function FinanceManager({ transactions, estimates, mediaUrls = {} }: Props) {
  const t = useDict();
  const lang = useLang() as Lang;
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const money = (n: number) => formatMoney(n, lang);
  const trm = (m: Record<Lang, string>) => m[lang] ?? m.en;

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.kind === "income") income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  // Waste / loss / return / reuse metrics — the heart of material tracking.
  const waste = useMemo(() => {
    let lostValue = 0;
    let returnedValue = 0;
    let reusedValue = 0;
    let lossCount = 0;
    for (const tx of transactions) {
      const d = tx.disposition as Disposition | null | undefined;
      if (!d) continue;
      const amt = Number(tx.amount);
      if (LOSS_DISPOSITIONS.includes(d)) {
        lostValue += tx.waste_value != null ? Number(tx.waste_value) : amt;
        lossCount += 1;
      } else if (d === "returned") returnedValue += amt;
      else if (d === "reused") reusedValue += amt;
    }
    const rate = totals.expense > 0 ? (lostValue / totals.expense) * 100 : 0;
    return { lostValue, returnedValue, reusedValue, lossCount, rate };
  }, [transactions, totals.expense]);

  // Loss broken down by job — where the leaks concentrate.
  const wasteByJob = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const d = tx.disposition as Disposition | null | undefined;
      if (!d || !LOSS_DISPOSITIONS.includes(d)) continue;
      const label = tx.estimates?.title ?? "—";
      const val = tx.waste_value != null ? Number(tx.waste_value) : Number(tx.amount);
      map.set(label, (map.get(label) ?? 0) + val);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [transactions]);

  function remove(id: string) {
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  const byDate = useMemo(() => {
    const groups = new Map<string, JobTransaction[]>();
    for (const tx of transactions) {
      const list = groups.get(tx.occurred_at) ?? [];
      list.push(tx);
      groups.set(tx.occurred_at, list);
    }
    return [...groups.entries()];
  }, [transactions]);

  const catLabel = (c: string) => t.finance.categories[c] ?? c;
  const hasWaste = waste.lostValue > 0 || waste.returnedValue > 0 || waste.reusedValue > 0;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t.finance.title}</h1>
        <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> {t.finance.add}
        </Button>
      </header>

      {/* summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] uppercase text-muted-foreground">{t.finance.income}</span>
            <span className="text-sm font-bold">{money(totals.income)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            <span className="text-[10px] uppercase text-muted-foreground">{t.finance.expenses}</span>
            <span className="text-sm font-bold">{money(totals.expense)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase text-muted-foreground">{t.finance.balance}</span>
            <span className={cn("text-sm font-bold", totals.net < 0 ? "text-rose-500" : "text-emerald-600")}>
              {money(totals.net)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* waste & loss metrics */}
      {hasWaste && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <TriangleAlert className="h-4 w-4 text-amber-500" /> {trm(M.wasteTitle)}
              </p>
              <span className="text-xs text-muted-foreground">
                {waste.rate.toFixed(1)}% {trm(M.ofSpend)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MetricCell icon={<TriangleAlert className="h-4 w-4" />} accent="text-rose-600" label={trm(M.lost)} value={money(waste.lostValue)} />
              <MetricCell icon={<RotateCcw className="h-4 w-4" />} accent="text-blue-600" label={trm(M.returned)} value={money(waste.returnedValue)} />
              <MetricCell icon={<Recycle className="h-4 w-4" />} accent="text-emerald-600" label={trm(M.reused)} value={money(waste.reusedValue)} />
            </div>

            {wasteByJob.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {trm(M.byJob)}
                </p>
                {wasteByJob.map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="shrink-0 font-semibold text-rose-600 tabular-nums">{money(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* list */}
      {transactions.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t.finance.empty}</p>
      ) : (
        <div className="space-y-3">
          {byDate.map(([day, list]) => (
            <div key={day}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                {new Date(`${day}T12:00:00`).toLocaleDateString(
                  lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
                  { day: "2-digit", month: "short" }
                )}
              </p>
              <Card>
                <CardContent className="divide-y p-0">
                  {list.map((tx) => {
                    const disp = tx.disposition as Disposition | null | undefined;
                    const photoUrl = tx.photo_path ? mediaUrls[tx.photo_path] : undefined;
                    const invoiceUrl = tx.invoice_path ? mediaUrls[tx.invoice_path] : undefined;
                    return (
                      <div key={tx.id} className="flex items-center gap-2 px-3 py-2">
                        {photoUrl ? (
                          <a
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted"
                          >
                            <Image src={photoUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                          </a>
                        ) : tx.kind === "income" ? (
                          <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            {tx.vendor ? `${tx.vendor} · ` : ""}
                            {catLabel(tx.category)}
                            {tx.description ? ` · ${tx.description}` : ""}
                          </p>
                          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {tx.estimates?.title && <span className="truncate">{tx.estimates.title}</span>}
                            {tx.quantity != null && (
                              <span>
                                {tx.quantity}
                                {tx.unit ? ` ${tx.unit}` : ""}
                              </span>
                            )}
                            {invoiceUrl && (
                              <a
                                href={invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary"
                              >
                                <FileText className="h-2.5 w-2.5" /> {trm(M.invoice)}
                              </a>
                            )}
                            {disp && disp !== "used" && (
                              <span className={cn("rounded px-1 py-0.5 text-[9px] font-semibold", DISP_BADGE[disp].cls)}>
                                {trm(DISP_BADGE[disp].label)}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "whitespace-nowrap text-sm font-semibold",
                            tx.kind === "income" ? "text-emerald-600" : "text-rose-500"
                          )}
                        >
                          {tx.kind === "income" ? "+" : "−"}
                          {money(Number(tx.amount))}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          aria-label={t.common.delete}
                          onClick={() => remove(tx.id)}
                          disabled={pending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <TransactionCadastro open={showForm} onClose={() => setShowForm(false)} estimates={estimates} />
    </section>
  );
}

function MetricCell({
  icon,
  accent,
  label,
  value,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-muted/40 p-2.5">
      <span className={cn("flex items-center gap-1", accent)}>{icon}</span>
      <span className="truncate text-sm font-bold">{value}</span>
      <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}
