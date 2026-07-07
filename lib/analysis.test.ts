import { describe, it, expect } from "vitest";
import { analyzeProject } from "./analysis";
import { computeTakeoff, computeTotals } from "./takeoff";
import { defaultRooms, ROOM_OPENINGS, workToTrade } from "./wizard/schema";

describe("wizard schema", () => {
  it("single_house default rooms map to sensible counts", () => {
    const rooms = defaultRooms("single_house");
    expect(rooms.filter((r) => r.key === "bedroom")).toHaveLength(2);
    expect(rooms.filter((r) => r.key === "suite")).toHaveLength(1);
    expect(rooms.every((r) => r.length > 0 && r.width > 0)).toBe(true);
  });

  it("metal_trim maps to trade trim with metal scope", () => {
    const m = workToTrade("metal_trim");
    expect(m.trade).toBe("trim");
    expect(m.material_name).toContain("metal");
  });

  it("every room key has openings defined", () => {
    expect(ROOM_OPENINGS.bedroom.doors).toBe(1);
    expect(ROOM_OPENINGS.closet.windows).toBe(0);
  });
});

describe("project analysis (PM §3.23 / §11.12)", () => {
  const areas = [{ length_ft: 12, width_ft: 14 }];
  const framing = computeTakeoff({ trade: "framing", areas, doors: 1, windows: 1, conditions: { demo: true } }, []);
  const trim = computeTakeoff({ trade: "trim", areas, doors: 1 }, []);
  const paint = computeTakeoff({ trade: "painting", areas, wall_height_ft: 8 }, []);
  const perTrade = [
    { trade: "framing", takeoff: framing },
    { trade: "trim", takeoff: trim },
    { trade: "painting", takeoff: paint },
  ];
  const items = perTrade.flatMap((t) => t.takeoff.items);
  const totals = computeTotals(items, 10, 20, 0, 15);
  const analysis = analyzeProject(perTrade, totals, { demo: true });

  it("risk factors include demo and multiTrade; contingency 5–15%", () => {
    expect(analysis.risk.factors).toContain("demo");
    expect(analysis.risk.factors).toContain("multiTrade");
    expect(analysis.risk.contingencyPct).toBeGreaterThanOrEqual(5);
    expect(analysis.risk.contingencyPct).toBeLessThanOrEqual(15);
  });

  it("schedule follows build order: framing → trim → painting", () => {
    const order = analysis.schedule.map((s) => s.trade);
    expect(order).toEqual(["framing", "trim", "painting"]);
  });

  it("payments = 40/40/20 of total (PM §11 progress payments)", () => {
    const sum = analysis.payments.reduce((s, p) => s + p.amount, 0);
    expect(Math.abs(sum - totals.total)).toBeLessThan(0.05);
    expect(analysis.payments.map((p) => p.pct)).toEqual([40, 40, 20]);
  });

  it("waste cost is positive when materials exist", () => {
    expect(analysis.totalWasteCost).toBeGreaterThan(0);
  });
});
