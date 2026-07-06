import { describe, it, expect } from "vitest";
import { computeTakeoff, computeTotals } from "./index";
import { withWaste, wasteFactor } from "./waste";
import { totalSqft, totalPerimeterLf } from "./geometry";
import type { PriceEntry } from "./types";

const prices: PriceEntry[] = [
  { trade: "flooring", name: "Luxury vinyl plank (LVP) - standard", unit: "sqft", material_cost: 3.75, labor_cost: 2.25, isUserPrice: false },
  { trade: "flooring", name: "Underlayment", unit: "sqft", material_cost: 0.6, labor_cost: 0.3, isUserPrice: false },
  { trade: "flooring", name: "Baseboard install", unit: "lf", material_cost: 1.8, labor_cost: 2.2, isUserPrice: false },
  { trade: "flooring", name: "Baseboard removal", unit: "lf", material_cost: 0, labor_cost: 0.75, isUserPrice: false },
  { trade: "flooring", name: "Transition strip", unit: "ea", material_cost: 22, labor_cost: 15, isUserPrice: false },
  { trade: "flooring", name: "Carpet removal (demo)", unit: "sqft", material_cost: 0, labor_cost: 0.6, isUserPrice: false },
  { trade: "flooring", name: "Debris disposal", unit: "load", material_cost: 0, labor_cost: 150, isUserPrice: false },
];

describe("waste", () => {
  it("850 sqft + 10% waste = 935 sqft (user's example)", () => {
    expect(withWaste(850, wasteFactor("flooring", "vinyl plank"))).toBe(935);
  });
});

describe("geometry", () => {
  it("12x14 room = 168 sqft, 52 lf perimeter", () => {
    const areas = [{ length_ft: 12, width_ft: 14 }];
    expect(totalSqft(areas)).toBe(168);
    expect(totalPerimeterLf(areas)).toBe(52);
  });
  it("sqft-only area approximates perimeter", () => {
    expect(totalPerimeterLf([{ sqft: 100 }])).toBe(40);
  });
});

describe("flooring takeoff", () => {
  const result = computeTakeoff(
    {
      trade: "flooring",
      areas: [{ name: "bedroom", length_ft: 12, width_ft: 14 }],
      conditions: { demo: true, demo_surface: "carpet" },
      material_name: "vinyl plank",
      quality_tier: "standard",
      doorways: 1,
    },
    prices
  );

  it("computes area and waste", () => {
    expect(result.area_sqft).toBe(168);
    expect(result.waste_pct).toBe(10);
  });

  it("includes LVP material at 185 sqft (168 + 10%)", () => {
    const lvp = result.items.find((i) => i.kind === "material" && i.description.includes("vinyl"));
    expect(lvp).toBeDefined();
    expect(lvp!.qty).toBe(185);
    expect(lvp!.unit_cost).toBe(3.75);
  });

  it("includes demo, disposal, baseboard, transitions", () => {
    const kinds = result.items.map((i) => i.kind);
    expect(kinds).toContain("demo");
    expect(kinds).toContain("disposal");
    const desc = result.items.map((i) => i.description).join(" | ");
    expect(desc).toMatch(/Baseboard install/);
    expect(desc).toMatch(/Transition/);
  });

  it("plans a realistic crew", () => {
    expect(result.crew_size).toBeGreaterThanOrEqual(1);
    expect(result.est_days).toBeGreaterThan(0);
  });
});

describe("totals + margin score", () => {
  it("builds price with overhead, profit, tax", () => {
    const items = [
      { kind: "material" as const, description: "x", qty: 100, unit: "sqft", unit_cost: 3, total: 300, is_estimated_price: false },
      { kind: "labor" as const, description: "y", qty: 100, unit: "sqft", unit_cost: 2, total: 200, is_estimated_price: false },
    ];
    const t = computeTotals(items, 10, 20, 0, 15);
    expect(t.subtotal).toBe(500);
    expect(t.overhead_amount).toBe(50);
    expect(t.profit_amount).toBe(110);
    expect(t.total).toBe(660);
    expect(t.margin_score).toBe("healthy"); // 110/660 = 16.7% >= 15%
  });

  it("flags low margin", () => {
    const items = [
      { kind: "labor" as const, description: "y", qty: 1, unit: "hr", unit_cost: 100, total: 100, is_estimated_price: false },
    ];
    const t = computeTotals(items, 10, 5, 0, 15);
    expect(t.margin_score).toBe("low");
  });
});
