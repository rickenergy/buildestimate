import { describe, it, expect } from "vitest";
import { locationIndex, applyLocationFactor } from "./location";
import { computeTakeoff } from "./index";

describe("location cost index (RSMeans-style CCI)", () => {
  it("Philadelphia ≠ King of Prussia (user's requirement)", () => {
    const philly = locationIndex("Philadelphia, PA");
    const kop = locationIndex("King of Prussia");
    expect(philly.factor).toBe(1.15);
    expect(kop.factor).toBe(1.1);
    expect(philly.factor).not.toBe(kop.factor);
  });

  it("Camden ≠ Cherry Hill", () => {
    expect(locationIndex("Camden NJ").factor).not.toBe(locationIndex("Cherry Hill").factor);
  });

  it("resolves by ZIP: 19406 (KOP) vs 19104 (Philly)", () => {
    expect(locationIndex("19406").label).toContain("King of Prussia");
    expect(locationIndex("123 Market St, 19104").label).toBe("Philadelphia, PA");
  });

  it("full address with ZIP wins over noise words", () => {
    const r = locationIndex("456 Haddonfield Rd, Cherry Hill, NJ 08002");
    expect(r.factor).toBe(1.1);
  });

  it("falls back to state, then to 1.00", () => {
    expect(locationIndex("somewhere in TX").factor).toBe(0.88);
    expect(locationIndex("")).toEqual({ factor: 1, label: "" });
    expect(locationIndex("unknown place").factor).toBe(1);
  });
});

describe("applyLocationFactor", () => {
  const base = computeTakeoff(
    { trade: "flooring", areas: [{ length_ft: 12, width_ft: 14 }] },
    []
  );

  it("labor scales fully, material 60% of deviation", () => {
    const scaled = applyLocationFactor(base, 1.2);
    expect(scaled.labor_cost).toBeCloseTo(base.labor_cost * 1.2, 0);
    expect(scaled.material_cost).toBeCloseTo(base.material_cost * 1.12, 0);
  });

  it("factor 1 is a no-op", () => {
    expect(applyLocationFactor(base, 1)).toBe(base);
  });
});
