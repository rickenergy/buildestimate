import type { Trade } from "@/lib/types";

/**
 * Not every trade is measured by floor area. This config drives the Quick
 * form: which measurement modes to offer per trade, and which extra inputs
 * (openings, roof pitch, slab depth) help the estimate.
 * Grounded in US estimating practice — see docs and lib/takeoff/*.
 */

export type MeasureMode = "area" | "wall" | "linear" | "footprint";

export interface TradeMeasure {
  modes: MeasureMode[];
  primary: MeasureMode;
  openings?: boolean; // doors + windows (framing headers, trim casing)
  pitch?: boolean; // roof slope factor
  depth?: boolean; // concrete slab thickness
}

export const TRADE_MEASURE: Record<Trade, TradeMeasure> = {
  flooring: { modes: ["area"], primary: "area" },
  tile: { modes: ["area", "wall"], primary: "area" },
  painting: { modes: ["wall", "area"], primary: "wall", openings: true },
  drywall: { modes: ["wall", "area"], primary: "wall", openings: true },
  framing: { modes: ["wall", "linear"], primary: "wall", openings: true },
  trim: { modes: ["linear"], primary: "linear", openings: true },
  siding: { modes: ["wall", "area"], primary: "wall" },
  roofing: { modes: ["footprint"], primary: "footprint", pitch: true },
  concrete: { modes: ["area"], primary: "area", depth: true },
  landscaping: { modes: ["area", "linear"], primary: "area" },
  cleaning: { modes: ["area"], primary: "area" },
  remodeling: { modes: ["area", "wall"], primary: "area" },
  finish_basement: { modes: ["area"], primary: "area", openings: true },
  handyman: { modes: ["area"], primary: "area" },
};

/** Roof slope → run-length multiplier (EST Fig. 13.48, pitch/slope factors). */
export const PITCH_FACTORS: { key: string; factor: number }[] = [
  { key: "flat", factor: 1.0 },
  { key: "low", factor: 1.06 }, // 4/12
  { key: "medium", factor: 1.12 }, // 6/12
  { key: "steep", factor: 1.25 }, // 9/12+
];

/** Concrete slab depth (inches) → cubic-yard factor is handled in the engine; UI hint only. */
export const SLAB_DEPTHS = [4, 5, 6];
