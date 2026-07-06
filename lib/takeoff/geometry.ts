import type { AreaInput } from "./types";

export function areaSqft(a: AreaInput): number {
  if (a.sqft && a.sqft > 0) return a.sqft;
  if (a.length_ft && a.width_ft) return a.length_ft * a.width_ft;
  return 0;
}

export function totalSqft(areas: AreaInput[]): number {
  return areas.reduce((s, a) => s + areaSqft(a), 0);
}

/** Perimeter in linear feet. Square-room approximation when only sqft is known. */
export function totalPerimeterLf(areas: AreaInput[]): number {
  return areas.reduce((s, a) => {
    if (a.length_ft && a.width_ft) return s + 2 * (a.length_ft + a.width_ft);
    const sq = areaSqft(a);
    return s + (sq > 0 ? 4 * Math.sqrt(sq) : 0);
  }, 0);
}
