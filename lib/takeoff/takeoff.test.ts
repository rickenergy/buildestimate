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

describe("framing takeoff (EST ch. 13)", () => {
  // 148 lf perimeter like the book's residence example
  const result = computeTakeoff(
    {
      trade: "framing",
      areas: [{ length_ft: 50, width_ft: 24 }], // perimeter 148 lf
      wall_height_ft: 8,
      doors: 2,
      windows: 6,
      material_name: "exterior with sheathing",
    },
    []
  );

  it("studs: 0.75/lf + 1 + corners + openings (EST Ex. 13-11..14)", () => {
    const studs = result.items.find((i) => i.description.startsWith("Studs"));
    // 148*0.75=111 → 112, +6 corners/intersections×2=12, +8 openings×3=24 → 148 +10% waste = 163
    expect(studs?.qty).toBe(163);
  });

  it("plates: 3× wall lf (EST Ex. 13-10)", () => {
    const plates = result.items.find((i) => i.description.startsWith("Plates"));
    expect(plates?.qty).toBe(withWaste(148 * 3, 0.1));
  });

  it("sheathing: wall sf / 32 per sheet (EST Ex. 13-17)", () => {
    const osb = result.items.find((i) => i.description.startsWith("Wall sheathing"));
    // 148×8=1184 sf +10% = 1303 → /32 = 40.7 → 41 sheets
    expect(osb?.qty).toBe(41);
  });

  it("includes headers and framing labor", () => {
    expect(result.items.some((i) => i.description.startsWith("Headers"))).toBe(true);
    expect(result.items.some((i) => i.description.startsWith("Framing labor"))).toBe(true);
  });
});

describe("trim takeoff (EST 13-7)", () => {
  it("baseboard = perimeter − 3 lf per door, ~5% waste (EST Ex. 13-25)", () => {
    const result = computeTakeoff(
      {
        trade: "trim",
        areas: [{ length_ft: 12, width_ft: 14 }], // 52 lf
        doors: 1,
      },
      []
    );
    const base = result.items.find((i) => i.description.startsWith("Baseboard"));
    expect(base?.qty).toBe(withWaste(52 - 3, 0.05)); // 49 → 52
    expect(result.items.some((i) => i.description.startsWith("Door casing"))).toBe(true);
  });

  it("metal trim: aluminum fascia + soffit + drip edge", () => {
    const result = computeTakeoff(
      {
        trade: "trim",
        areas: [{ sqft: 1600 }],
        linear_feet: 160,
        material_name: "metal aluminum fascia soffit",
      },
      []
    );
    expect(result.items.some((i) => i.description.startsWith("Aluminum fascia"))).toBe(true);
    expect(result.items.some((i) => i.description.startsWith("Soffit"))).toBe(true);
    expect(result.items.some((i) => i.description.startsWith("Drip edge"))).toBe(true);
  });
});
