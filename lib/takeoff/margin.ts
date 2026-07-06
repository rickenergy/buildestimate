import type { ComputedItem, EstimateTotals } from "./types";
import type { MarginScore } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Price build-up: cost subtotal → + overhead → + profit → + tax.
 * Margin = (price before tax - cost - overhead) / price before tax.
 */
export function computeTotals(
  items: ComputedItem[],
  overheadPct: number,
  profitPct: number,
  taxPct: number,
  minMarginPct: number
): EstimateTotals {
  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
  const overhead = round2(subtotal * (overheadPct / 100));
  const profit = round2((subtotal + overhead) * (profitPct / 100));
  const preTax = subtotal + overhead + profit;
  const tax = round2(preTax * (taxPct / 100));
  const total = round2(preTax + tax);

  const marginPct = preTax > 0 ? round2((profit / preTax) * 100) : 0;

  let score: MarginScore = "healthy";
  if (marginPct < minMarginPct * 0.6) score = "low";
  else if (marginPct < minMarginPct) score = "medium";

  return {
    subtotal,
    overhead_amount: overhead,
    profit_amount: profit,
    tax_amount: tax,
    total,
    margin_pct: marginPct,
    margin_score: score,
  };
}
