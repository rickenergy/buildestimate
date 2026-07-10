"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDict, useLang } from "@/components/providers";
import { formatNumber } from "@/lib/format";
import type { PermitPulse, PermitSeries } from "@/lib/permits";
import { Building2, TrendingDown, TrendingUp, Minus } from "lucide-react";

/** Tiny inline sparkline for a permit series (no chart deps). */
function Spark({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 100;
  const h = 24;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p.value - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
    </svg>
  );
}

export function PermitPulseCard({ pulse }: { pulse: PermitPulse }) {
  const t = useDict();
  const lang = useLang();
  const p = t.permits;

  if (pulse.needsKey) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {p.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{p.needsKey}</p>
          <a
            href={pulse.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-primary underline"
          >
            {p.getKey}
          </a>
        </CardContent>
      </Card>
    );
  }

  const hasData = !pulse.error && pulse.series.some((s) => s.latest !== null);
  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {p.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{p.unavailable}</CardContent>
      </Card>
    );
  }

  const label: Record<PermitSeries["metric"], string> = {
    permits_total: p.permitsTotal,
    permits_single: p.permitsSingle,
    starts_total: p.startsTotal,
  };

  const monthLabel = pulse.updated
    ? new Date(`${pulse.updated}-01T12:00:00`).toLocaleDateString(
        lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
        { month: "short", year: "numeric" }
      )
    : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Building2 className="h-4 w-4 text-primary" /> {p.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{p.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {pulse.series
            .filter((s) => s.latest !== null)
            .map((s) => {
              const up = (s.yoyPct ?? 0) > 0;
              const flat = (s.yoyPct ?? 0) === 0;
              const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
              const color = flat
                ? "text-muted-foreground"
                : up
                ? "text-emerald-500"
                : "text-red-500";
              return (
                <div key={s.metric} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{label[s.metric]}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {formatNumber(s.latest!, lang)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {p.unit}
                    </span>
                  </p>
                  {s.yoyPct !== null && (
                    <p className={`flex items-center gap-1 text-xs ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {up ? "+" : ""}
                      {s.yoyPct}% {p.yoy}
                    </p>
                  )}
                  <div className={color}>
                    <Spark points={s.points} />
                  </div>
                </div>
              );
            })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {p.source}
          {monthLabel ? ` · ${p.updated} ${monthLabel}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
