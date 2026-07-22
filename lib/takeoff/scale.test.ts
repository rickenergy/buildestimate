import { describe, it, expect } from "vitest";
import { pxPerFoot, feetBetween, polygonSqft, rectSqft, polygonLf, round1 } from "./scale";

describe("scale calibration", () => {
  // 240 px drawn over a known 10 ft door/wall → 24 px/ft
  it("derives px/ft from a reference line", () => {
    expect(pxPerFoot({ x: 0, y: 0 }, { x: 240, y: 0 }, 10)).toBe(24);
  });

  it("uses diagonal pixel distance", () => {
    // 3-4-5 triangle: 300 px over 10 ft
    expect(pxPerFoot({ x: 0, y: 0 }, { x: 180, y: 240 }, 10)).toBe(30);
  });

  it("returns 0 for degenerate input (not calibrated)", () => {
    expect(pxPerFoot({ x: 0, y: 0 }, { x: 0, y: 0 }, 10)).toBe(0);
    expect(pxPerFoot({ x: 0, y: 0 }, { x: 240, y: 0 }, 0)).toBe(0);
  });

  it("measures real feet with a calibrated scale", () => {
    // at 24 px/ft, 288 px = 12 ft
    expect(feetBetween({ x: 0, y: 0 }, { x: 288, y: 0 }, 24)).toBe(12);
  });

  it("rect corners → sqft (14×12 room at 24 px/ft)", () => {
    const sqft = rectSqft({ x: 0, y: 0 }, { x: 14 * 24, y: 12 * 24 }, 24);
    expect(round1(sqft)).toBe(168); // 14 × 12
  });

  it("polygon area matches the rectangle (shoelace)", () => {
    const s = 24;
    const rect = [
      { x: 0, y: 0 },
      { x: 14 * s, y: 0 },
      { x: 14 * s, y: 12 * s },
      { x: 0, y: 12 * s },
    ];
    expect(round1(polygonSqft(rect, s))).toBe(168);
    expect(round1(polygonLf(rect, s))).toBe(52); // 2×(14+12)
  });

  it("returns 0 for uncalibrated or too-few points", () => {
    expect(polygonSqft([{ x: 0, y: 0 }, { x: 1, y: 1 }], 24)).toBe(0);
    expect(polygonSqft([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], 0)).toBe(0);
  });
});
