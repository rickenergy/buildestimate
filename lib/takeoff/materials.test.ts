import { describe, it, expect } from "vitest";
import { toPurchasePack, materialTakeoff, materialVsLabor } from "./materials";
import type { ComputedItem } from "./types";

const mat = (description: string, qty: number, unit: string, total = 0): ComputedItem => ({
  kind: "material",
  description,
  qty,
  unit,
  unit_cost: qty ? total / qty : 0,
  total,
  is_estimated_price: true,
});

describe("purchase packs", () => {
  it("drywall sqft → 4×8 sheets", () => {
    expect(toPurchasePack({ description: 'Drywall 1/2"', qty: 3151, unit: "sqft" })?.packs).toBe(99); // ceil(3151/32)
  });

  it("paint reads coats from the label (walls = 2 coats)", () => {
    const p = toPurchasePack({ description: "Paint walls (2 coats)", qty: 1620, unit: "sqft" });
    expect(p?.packs).toBe(10); // ceil(1620×2/350)
    expect(p?.packLabel).toBe("gallons");
  });

  it("primer defaults to 1 coat", () => {
    expect(toPurchasePack({ description: "Primer coat", qty: 700, unit: "sqft" })?.packs).toBe(2); // ceil(700/350)
  });

  it("flooring sqft → boxes", () => {
    expect(toPurchasePack({ description: "LVP plank (935 sqft incl. 10% waste)", qty: 935, unit: "sqft" })?.packs).toBe(47); // ceil(935/20)
  });

  it("thinset → 50 lb bags", () => {
    expect(toPurchasePack({ description: "Thinset mortar", qty: 300, unit: "sqft" })?.packs).toBe(4); // ceil(300/95)
  });

  it("plates lf → 16 ft boards", () => {
    expect(toPurchasePack({ description: "Plates — sole + double top", qty: 200, unit: "lf" })?.packs).toBe(13); // ceil(200/16)
  });

  it("pcs stays a count", () => {
    const p = toPurchasePack({ description: "Studs 2×4", qty: 210, unit: "pcs" });
    expect(p?.packs).toBe(210);
    expect(p?.packLabel).toBe("pcs");
  });

  it("unknown material stays in native unit (no pack)", () => {
    expect(toPurchasePack({ description: "Misc caulk", qty: 5, unit: "sqft" })).toBeUndefined();
  });
});

describe("aggregation", () => {
  it("merges same material across rooms, ignores labor", () => {
    const items: ComputedItem[] = [
      mat('Drywall 1/2"', 500, "sqft"),
      mat('Drywall 1/2"', 468, "sqft"),
      { ...mat('Drywall 1/2"', 500, "sqft"), kind: "labor" }, // labor line ignored
    ];
    const list = materialTakeoff(items);
    expect(list).toHaveLength(1);
    expect(list[0].qty).toBe(968);
    expect(list[0].purchase?.packs).toBe(31); // ceil(968/32)
  });

  it("splits material vs labor cost for the toggle", () => {
    const items: ComputedItem[] = [
      mat('Drywall 1/2"', 100, "sqft", 55),
      { ...mat("Hang & finish — labor", 100, "sqft", 130), kind: "labor" },
      { ...mat("Debris disposal", 1, "load", 150), kind: "disposal" },
    ];
    expect(materialVsLabor(items)).toEqual({ material: 55, labor: 280 });
  });
});
