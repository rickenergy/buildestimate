import type { QualityTier } from "@/lib/types";

/** Waste factor (fraction) by trade/material. */
export function wasteFactor(trade: string, materialName = ""): number {
  const name = materialName.toLowerCase();
  switch (trade) {
    case "flooring":
      if (name.includes("hardwood")) return 0.12;
      if (name.includes("carpet")) return 0.1;
      return 0.1; // LVP, laminate
    case "tile":
      return 0.15; // cuts + breakage; diagonal layouts need more
    case "drywall":
      return 0.12;
    case "roofing":
      return 0.12;
    case "framing":
      return 0.1; // dimensional lumber cuts/culls (EST ch. 13 practice)
    case "trim":
      return 0.05; // EST Ex. 13-25: 421 lf → order 440 (~5%)
    case "siding":
      return 0.12;
    case "concrete":
      return 0.08;
    case "painting":
      return 0.05; // extra paint allowance
    default:
      return 0.1;
  }
}

/** Apply waste and round up to whole unit (float-safe). */
export function withWaste(qty: number, factor: number): number {
  return Math.ceil(Math.round(qty * (1 + factor) * 1000) / 1000);
}

/** Material tier multiplier applied to default (estimated) prices only. */
export function tierMultiplier(tier: QualityTier): number {
  switch (tier) {
    case "basic":
      return 0.85;
    case "premium":
      return 1.35;
    default:
      return 1;
  }
}
