import { describe, it, expect } from "vitest";
import { parseUsAddress } from "./geo";

describe("parseUsAddress", () => {
  it("full street address", () => {
    expect(parseUsAddress("123 Main St, Orlando, FL 32801")).toEqual({
      zip: "32801",
      city: "Orlando",
      state: "FL",
    });
  });
  it("city, state zip", () => {
    expect(parseUsAddress("Orlando, FL 32801")).toEqual({
      zip: "32801",
      city: "Orlando",
      state: "FL",
    });
  });
  it("zip only", () => {
    expect(parseUsAddress("32801")).toEqual({ zip: "32801", city: null, state: null });
  });
  it("city + state, no zip", () => {
    expect(parseUsAddress("Miami, FL")).toEqual({ zip: null, city: "Miami", state: "FL" });
  });
  it("zip+4 keeps 5-digit", () => {
    expect(parseUsAddress("Austin, TX 78701-1234").zip).toBe("78701");
  });
  it("empty / null", () => {
    expect(parseUsAddress(null)).toEqual({ zip: null, city: null, state: null });
    expect(parseUsAddress("   ")).toEqual({ zip: null, city: null, state: null });
  });
  it("ignores a non-state 2-letter token", () => {
    expect(parseUsAddress("St Cloud, MN 56301").state).toBe("MN");
  });
});
