"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import {
  generateMarketInsights,
  type MarketInsights as Insights,
} from "@/app/actions/market";
import { Sparkles, Loader2, RefreshCw, KeyRound, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const SIGNAL_L: Record<string, string> = {
  en: "Live demand · US Census permits",
  pt: "Demanda real · Census permits (EUA)",
  es: "Demanda real · Census permits (EE.UU.)",
};
const TREND_L: Record<"expanding" | "cooling" | "flat", Record<string, string>> = {
  expanding: { en: "Expanding", pt: "Aquecendo", es: "En expansión" },
  cooling: { en: "Cooling", pt: "Esfriando", es: "Enfriando" },
  flat: { en: "Flat", pt: "Estável", es: "Estable" },
};

const REGION_L: Record<string, string> = { en: "region", pt: "região", es: "región" };
const FLOOR_L: Record<string, string> = {
  en: "Floor (cost+margin)",
  pt: "Piso (custo+margem)",
  es: "Piso (costo+margen)",
};

interface Props {
  estimateId: string;
  initial: Insights | null;
}

export function MarketInsightsCard({ estimateId, initial }: Props) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();
  const [insights, setInsights] = useState<Insights | null>(initial);
  const [needsKey, setNeedsKey] = useState(false);

  function run() {
    startTransition(async () => {
      const res = await generateMarketInsights(estimateId);
      if (res.ok && res.insights) {
        setInsights(res.insights);
        setNeedsKey(false);
      } else if (res.needsKey) {
        setNeedsKey(true);
      } else {
        toast.error(res.error ?? t.common.error);
      }
    });
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">{t.market.title}</p>
            <p className="text-xs text-muted-foreground">{t.market.intro}</p>
          </div>
          {needsKey ? (
            <div className="flex items-start gap-2 rounded-xl border border-dashed bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              {t.market.needsKey}
            </div>
          ) : (
            <Button onClick={run} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t.market.analyzing}
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-4 w-4" /> {t.market.analyze}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const ranges = [
    { label: t.market.region, r: insights.region },
    { label: t.market.state, r: insights.state },
    { label: t.market.topCompanies, r: insights.top_companies },
  ];
  const maxHigh = Math.max(...ranges.map(({ r }) => r.high), insights.our_total);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> {t.market.title}
          </CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={run}
            disabled={pending}
            aria-label={t.market.refresh}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Real external signal — US Census building permits */}
        {insights.market_signal && (
          <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {SIGNAL_L[lang] ?? SIGNAL_L.en}
              </p>
              <p className="text-xs font-medium">
                {insights.market_signal.region_label} ·{" "}
                {insights.market_signal.permits_yoy_pct >= 0 ? "+" : ""}
                {insights.market_signal.permits_yoy_pct}% YoY
                {insights.market_signal.updated ? ` · ${insights.market_signal.updated}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                insights.market_signal.trend === "expanding"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : insights.market_signal.trend === "cooling"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {TREND_L[insights.market_signal.trend][lang] ?? TREND_L[insights.market_signal.trend].en}
            </span>
          </div>
        )}

        {/* Range bars vs our price */}
        <section className="space-y-3">
          {ranges.map(({ label, r }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">
                  {formatMoney(r.low, lang)} – {formatMoney(r.high, lang)}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 rounded-full bg-primary/30"
                  style={{
                    left: `${(r.low / maxHigh) * 100}%`,
                    width: `${Math.max(2, ((r.high - r.low) / maxHigh) * 100)}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 rounded bg-primary"
                  style={{ left: `${(r.avg / maxHigh) * 100}%` }}
                />
                {/* our price marker */}
                <div
                  className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground"
                  style={{ left: `${Math.min(99, (insights.our_total / maxHigh) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {t.market.avg}: {formatMoney(r.avg, lang)}
                </span>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            ▌ {t.market.ourPrice}: {formatMoney(insights.our_total, lang)}
          </p>
        </section>

        {/* Unit economics — anchored on our real cost engine */}
        {insights.our_unit_price != null && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">$/sqft</p>
              <p className="text-sm font-bold">
                {formatMoney(insights.our_unit_price, lang)}
                {insights.region_unit_price != null && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    · {formatMoney(insights.region_unit_price, lang)} {REGION_L[lang] ?? REGION_L.en}
                  </span>
                )}
              </p>
            </div>
            {insights.cost_floor != null && (
              <div className="rounded-xl bg-muted/50 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {FLOOR_L[lang] ?? FLOOR_L.en}
                </p>
                <p className="text-sm font-bold">{formatMoney(insights.cost_floor, lang)}</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Competitor profiles */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t.market.competitors}
          </p>
          {insights.competitors.map((c, i) => (
            <div key={i} className="rounded-xl border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.profile}</span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    c.typical_price >= insights.our_total ? "text-green-600" : "text-amber-600"
                  )}
                >
                  {formatMoney(c.typical_price, lang)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{c.note}</p>
            </div>
          ))}
        </section>

        <Separator />

        {/* Positioning + price to beat */}
        <section className="space-y-2">
          <p className="text-xs leading-relaxed">{insights.positioning}</p>
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2">
            <span className="text-xs font-semibold">{t.market.priceToBeat}</span>
            <span className="text-base font-bold text-primary">
              {formatMoney(insights.price_to_beat, lang)}
            </span>
          </div>
        </section>

        <p className="text-[10px] text-muted-foreground">{t.market.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
