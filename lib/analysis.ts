import type { EstimateTotals, TakeoffResult } from "@/lib/takeoff/types";

/**
 * Deterministic project analysis — risk, waste, schedule and cash management.
 * Grounded in "Construction Project Management" (Sears/Clough, 5th ed.):
 *  - §3.23 Markup: contingency/markup 5–20%+ scales with project risk
 *  - §3.22 Home office overhead 2–8% of volume
 *  - §11.12 Cash flow: outlay leads income; deposit + progress payments cover it
 * and "Estimating in Building Construction" waste-factor practice (ch. 13/16).
 */

export type RiskLevel = "low" | "medium" | "high";

/** i18n keys — resolved by the UI dictionary. */
export type RiskFactorKey =
  | "demo"
  | "multiTrade"
  | "tightMargin"
  | "largeArea"
  | "estimatedPrices";

export interface TradeWaste {
  trade: string;
  waste_pct: number;
  wasteCost: number; // material $ attributable to waste
}

export interface ScheduleRow {
  trade: string;
  days: number;
  crew: number;
}

export interface PaymentRow {
  labelKey: "deposit" | "progress" | "final";
  pct: number;
  amount: number;
}

export interface ProjectAnalysis {
  risk: {
    level: RiskLevel;
    factors: RiskFactorKey[];
    contingencyPct: number;
    contingencyAmount: number;
  };
  waste: TradeWaste[];
  totalWasteCost: number;
  schedule: ScheduleRow[];
  totalDays: number;
  laborPerDay: number;
  payments: PaymentRow[];
}

/** Build order: site → structure → envelope → interior rough → finishes → cleanup. */
const SEQUENCE = [
  "concrete",
  "framing",
  "roofing",
  "siding",
  "drywall",
  "tile",
  "trim",
  "painting",
  "flooring",
  "remodeling",
  "handyman",
  "landscaping",
  "cleaning",
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function analyzeProject(
  perTrade: { trade: string; takeoff: TakeoffResult }[],
  totals: EstimateTotals,
  conditions: Record<string, unknown>
): ProjectAnalysis {
  // ---- Waste: material $ share attributable to the waste factor -------------
  const waste: TradeWaste[] = perTrade.map(({ trade, takeoff }) => {
    const pct = takeoff.waste_pct / 100;
    return {
      trade,
      waste_pct: takeoff.waste_pct,
      wasteCost: round2(takeoff.material_cost * (pct / (1 + pct))),
    };
  });
  const totalWasteCost = round2(waste.reduce((s, w) => s + w.wasteCost, 0));

  // ---- Risk & contingency (PM §3.23: 5–20% scaling with risk) ---------------
  const factors: RiskFactorKey[] = [];
  if (conditions.demo) factors.push("demo");
  if (perTrade.length >= 3) factors.push("multiTrade");
  if (totals.margin_score !== "healthy") factors.push("tightMargin");
  const totalArea = Math.max(...perTrade.map((t) => t.takeoff.area_sqft), 0);
  if (totalArea > 2000) factors.push("largeArea");
  const estimatedShare =
    perTrade.flatMap((t) => t.takeoff.items).filter((i) => i.is_estimated_price).length /
    Math.max(1, perTrade.flatMap((t) => t.takeoff.items).length);
  if (estimatedShare > 0.5) factors.push("estimatedPrices");

  const contingencyPct = Math.min(15, 5 + factors.length * 2.5);
  const level: RiskLevel = factors.length >= 3 ? "high" : factors.length >= 1 ? "medium" : "low";

  // ---- Schedule in build order (PM: sequence field operations) --------------
  const schedule: ScheduleRow[] = [...perTrade]
    .sort((a, b) => SEQUENCE.indexOf(a.trade) - SEQUENCE.indexOf(b.trade))
    .map(({ trade, takeoff }) => ({ trade, days: takeoff.est_days, crew: takeoff.crew_size }));
  const totalDays = Math.round(schedule.reduce((s, r) => s + r.days, 0) * 2) / 2;

  const totalLabor = round2(
    perTrade.reduce((s, t) => s + t.takeoff.labor_cost + t.takeoff.demo_cost, 0)
  );
  const laborPerDay = totalDays > 0 ? round2(totalLabor / totalDays) : 0;

  // ---- Payment plan (PM §11: deposit + progress + final; outlay leads income)
  const payments: PaymentRow[] = [
    { labelKey: "deposit", pct: 40, amount: round2(totals.total * 0.4) },
    { labelKey: "progress", pct: 40, amount: round2(totals.total * 0.4) },
    { labelKey: "final", pct: 20, amount: round2(totals.total * 0.2) },
  ];

  return {
    risk: {
      level,
      factors,
      contingencyPct,
      contingencyAmount: round2(totals.total * (contingencyPct / 100)),
    },
    waste,
    totalWasteCost,
    schedule,
    totalDays,
    laborPerDay,
    payments,
  };
}
