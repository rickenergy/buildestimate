"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal SVG charts following the dataviz method: 2px lines, recessive
 * grid, direct labels + legend (identity never color-alone), one axis,
 * text in text tokens. Series colors are CVD-safe (green × slate blue —
 * distinct hue axis and lightness) via CSS vars set in globals.css.
 */

export interface LinePoint {
  date: string;
  income: number;
  expense: number;
}

export function CashLineChart({
  data,
  labels,
  formatValue,
}: {
  data: LinePoint[];
  labels: { income: string; expense: string };
  formatValue: (n: number) => string;
}) {
  const id = useId();
  const W = 640;
  const H = 200;
  const PAD = { l: 8, r: 76, t: 12, b: 20 };

  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const x = (i: number) =>
    PAD.l + (i / Math.max(1, data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const path = (key: "income" | "expense") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");

  const last = data[data.length - 1];
  const first = data[0];
  const gridYs = [0.25, 0.5, 0.75].map((f) => PAD.t + f * (H - PAD.t - PAD.b));

  const fmtDay = (s: string) => s.slice(5).replace("-", "/");

  return (
    <div>
      {/* legend */}
      <div className="mb-1 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-income)" }} />
          {labels.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-expense)" }} />
          {labels.expense}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>
          {labels.income}: {formatValue(last?.income ?? 0)} · {labels.expense}:{" "}
          {formatValue(last?.expense ?? 0)}
        </title>
        {gridYs.map((gy) => (
          <line
            key={gy}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={gy}
            y2={gy}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
        ))}
        <path d={path("expense")} fill="none" stroke="var(--chart-expense)" strokeWidth="2" strokeLinecap="round" />
        <path d={path("income")} fill="none" stroke="var(--chart-income)" strokeWidth="2" strokeLinecap="round" />
        {last && (
          <>
            <circle cx={x(data.length - 1)} cy={y(last.income)} r="3.5" fill="var(--chart-income)" />
            <circle cx={x(data.length - 1)} cy={y(last.expense)} r="3.5" fill="var(--chart-expense)" />
            {/* direct labels at line ends */}
            <text
              x={x(data.length - 1) + 6}
              y={y(last.income) + (last.income >= last.expense ? -4 : 12)}
              className="fill-current text-foreground"
              fontSize="11"
              fontWeight="600"
            >
              {formatValue(last.income)}
            </text>
            <text
              x={x(data.length - 1) + 6}
              y={y(last.expense) + (last.expense > last.income ? -4 : 12)}
              className="fill-current text-foreground"
              fontSize="11"
              fontWeight="600"
            >
              {formatValue(last.expense)}
            </text>
          </>
        )}
        {/* x labels: first + last day */}
        {first && (
          <text x={PAD.l} y={H - 4} fontSize="10" className="fill-current text-muted-foreground">
            {fmtDay(first.date)}
          </text>
        )}
        {last && (
          <text
            x={x(data.length - 1)}
            y={H - 4}
            fontSize="10"
            textAnchor="end"
            className="fill-current text-muted-foreground"
          >
            {fmtDay(last.date)}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Horizontal magnitude bars, single hue, 4px rounded data-end, direct labels. */
export function StageBars({
  rows,
  formatValue,
}: {
  rows: { label: string; value: number; count: number }[];
  formatValue: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{r.label}</span>
          <div className="h-3 rounded-sm bg-muted">
            <div
              className={cn("h-3 rounded-sm", r.value === 0 && "opacity-0")}
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                background: "var(--chart-income)",
              }}
            />
          </div>
          <span className="whitespace-nowrap font-medium tabular-nums">
            {r.count} · {formatValue(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Vertical monthly bars — single hue, 4px rounded tops, value labels. */
export function MonthlyBars({
  data,
  formatValue,
}: {
  data: { label: string; value: number }[];
  formatValue: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
            {d.value > 0 ? formatValue(d.value) : ""}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background: "var(--chart-income)",
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
