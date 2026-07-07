"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import type { ProjectAnalysis } from "@/lib/analysis";
import {
  ShieldAlert,
  Recycle,
  CalendarDays,
  Wallet,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function ProjectAnalysisCard({ analysis }: { analysis: ProjectAnalysis }) {
  const t = useDict();
  const lang = useLang();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t.analysis.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Risk */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> {t.analysis.riskTitle}
            </span>
            <Badge className={RISK_STYLES[analysis.risk.level]}>
              {t.analysis.risk[analysis.risk.level]}
            </Badge>
          </div>
          {analysis.risk.factors.length > 0 && (
            <ul className="space-y-1">
              {analysis.risk.factors.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  {t.analysis.factors[f]}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t.analysis.contingency} ({analysis.risk.contingencyPct}%)
            </span>
            <span className="font-semibold">
              {formatMoney(analysis.risk.contingencyAmount, lang)}
            </span>
          </div>
        </section>

        <Separator />

        {/* Waste */}
        <section className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Recycle className="h-3.5 w-3.5" /> {t.analysis.wasteTitle}
          </span>
          {analysis.waste.map((w) => (
            <div key={w.trade} className="flex items-center justify-between text-xs">
              <span>
                {t.trades[w.trade] ?? w.trade}
                <span className="ml-1 text-muted-foreground">({w.waste_pct}%)</span>
              </span>
              <span className="text-muted-foreground">{formatMoney(w.wasteCost, lang)}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-semibold">
            <span>{t.analysis.wasteCost}</span>
            <span>{formatMoney(analysis.totalWasteCost, lang)}</span>
          </div>
        </section>

        <Separator />

        {/* Schedule */}
        <section className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {t.analysis.scheduleTitle}
          </span>
          <div className="space-y-1">
            {analysis.schedule.map((row, i) => (
              <div key={`${row.trade}-${i}`} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{t.trades[row.trade] ?? row.trade}</span>
                <span className="text-muted-foreground">
                  {row.crew} {t.analysis.crew} · {row.days} {t.estimate.days}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span>
              {t.estimate.crew}: {t.analysis.laborPerDay}
            </span>
            <span>{formatMoney(analysis.laborPerDay, lang)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.analysis.scheduleTitle}</span>
            <span>
              {analysis.totalDays} {t.estimate.days}
            </span>
          </div>
        </section>

        <Separator />

        {/* Payments */}
        <section className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> {t.analysis.paymentsTitle}
          </span>
          {analysis.payments.map((p) => (
            <div key={p.labelKey} className="flex justify-between text-xs">
              <span>
                {t.analysis[p.labelKey]} ({p.pct}%)
              </span>
              <span className="font-medium">{formatMoney(p.amount, lang)}</span>
            </div>
          ))}
        </section>

        {/* AI competitors — coming soon */}
        <div className="flex items-center gap-2 rounded-xl border border-dashed bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          {t.analysis.competitorsSoon}
        </div>
      </CardContent>
    </Card>
  );
}
