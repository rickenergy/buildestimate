/**
 * Scale calibration — turn a plan with no printed dimensions into a measurable
 * one. The GC draws a line over a known length (a door = 3 ft, a stated
 * dimension, a scale bar) and types the real feet; we derive px-per-foot for
 * that page. After that, any traced room/line converts to sqft / lf.
 *
 * All points are in the image's NATURAL pixel space. The canvas UI is
 * responsible for mapping display coords → natural coords (× naturalWidth /
 * clientWidth) before calling these, so calibration and measurement share one
 * coordinate system.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Pixel distance between two points. */
export function pxDist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * px-per-foot from a reference line of known real length.
 * Returns 0 when inputs are degenerate (caller treats 0 as "not calibrated").
 */
export function pxPerFoot(p1: Pt, p2: Pt, knownFeet: number): number {
  const px = pxDist(p1, p2);
  if (knownFeet <= 0 || px <= 0) return 0;
  return px / knownFeet;
}

/** Real feet between two points given a calibrated px/ft. */
export function feetBetween(p1: Pt, p2: Pt, pxPerFt: number): number {
  if (pxPerFt <= 0) return 0;
  return pxDist(p1, p2) / pxPerFt;
}

/** Polygon area in sqft (shoelace). Needs ≥3 points and a valid scale. */
export function polygonSqft(pts: Pt[], pxPerFt: number): number {
  if (pts.length < 3 || pxPerFt <= 0) return 0;
  let cross = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    cross += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  const areaPx = Math.abs(cross) / 2;
  return areaPx / (pxPerFt * pxPerFt);
}

/** Rectangle (two opposite corners) → sqft. Convenience for the common room. */
export function rectSqft(a: Pt, b: Pt, pxPerFt: number): number {
  if (pxPerFt <= 0) return 0;
  const w = Math.abs(b.x - a.x) / pxPerFt;
  const h = Math.abs(b.y - a.y) / pxPerFt;
  return w * h;
}

/** Polygon perimeter in linear feet. `closed` adds the last→first edge. */
export function polygonLf(pts: Pt[], pxPerFt: number, closed = true): number {
  if (pts.length < 2 || pxPerFt <= 0) return 0;
  const edges = closed ? pts.length : pts.length - 1;
  let lf = 0;
  for (let i = 0; i < edges; i++) {
    lf += feetBetween(pts[i], pts[(i + 1) % pts.length], pxPerFt);
  }
  return lf;
}

/** Round to 1 decimal — takeoff numbers don't need more precision than that. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Key under which per-page px/ft calibration is stored in the answers jsonb. */
export const SCALES_KEY = "__scales";

/** Read calibrated px/ft per page index from the answers jsonb. */
export function parseScales(answers: Record<string, string> | null): Record<number, number> {
  try {
    const raw = answers?.[SCALES_KEY];
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}
