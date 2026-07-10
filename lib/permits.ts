import "server-only";
import type { CensusGeo } from "@/lib/census-region";

/**
 * Residential-construction pulse from the U.S. Census Bureau "New Residential
 * Construction" time series (EITS `resconst`) — housing units authorized by
 * permit and started, seasonally adjusted, at annual rate (thousands).
 *
 * Published for the nation and the four Census regions (geo_level_code), so we
 * show the contractor their own region when we can tell it from their jobs,
 * falling back to national. Requires a free CENSUS_API_KEY.
 * https://api.census.gov/data/key_signup.html
 */

const BASE = "https://api.census.gov/data/timeseries/eits/resconst";
const SIGNUP = "https://api.census.gov/data/key_signup.html";

export interface PermitPoint {
  time: string; // "YYYY-MM"
  value: number;
}

export type PermitMetric = "permits_total" | "permits_single" | "starts_total";

export interface PermitSeries {
  metric: PermitMetric;
  latest: number | null;
  yoyPct: number | null;
  points: PermitPoint[];
}

export interface PermitPulse {
  needsKey?: boolean;
  error?: boolean;
  signupUrl: string;
  geo: CensusGeo; // the region actually shown (may fall back to US)
  updated: string | null; // latest time slot, "YYYY-MM"
  series: PermitSeries[];
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Exact Census category_code / data_type_code per metric (verified live). */
const MATCHERS: Record<PermitMetric, { cat: string; dt: string }> = {
  permits_total: { cat: "APERMITS", dt: "TOTAL" },
  permits_single: { cat: "APERMITS", dt: "SINGLE" },
  starts_total: { cat: "ASTARTS", dt: "TOTAL" },
};

const METRICS = Object.keys(MATCHERS) as PermitMetric[];

/** key into the geo×metric buckets */
const bkey = (geo: string, m: PermitMetric) => `${geo}|${m}`;

export async function getPermitPulse(geo: CensusGeo = "US"): Promise<PermitPulse> {
  const key = process.env.CENSUS_API_KEY;
  if (!key)
    return { needsKey: true, signupUrl: SIGNUP, geo, updated: null, series: [] };

  const now = new Date();
  const toY = now.getUTCFullYear();
  const toM = now.getUTCMonth() + 1;
  const timeRange = `from ${toY - 2}-01 to ${toY}-${pad(toM)}`;
  const url =
    `${BASE}?get=cell_value,category_code,data_type_code,geo_level_code,time_slot_id` +
    `&time=${encodeURIComponent(timeRange)}&seasonally_adj=yes&key=${key}`;

  let rows: string[][];
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok)
      return { error: true, signupUrl: SIGNUP, geo, updated: null, series: [] };
    rows = (await res.json()) as string[][];
  } catch {
    return { error: true, signupUrl: SIGNUP, geo, updated: null, series: [] };
  }
  if (!Array.isArray(rows) || rows.length < 2)
    return { error: true, signupUrl: SIGNUP, geo, updated: null, series: [] };

  const header = rows[0];
  const iVal = header.indexOf("cell_value");
  const iCat = header.indexOf("category_code");
  const iDt = header.indexOf("data_type_code");
  const iGeo = header.indexOf("geo_level_code");
  const iTime = header.indexOf("time");
  if (iVal < 0 || iCat < 0 || iDt < 0 || iGeo < 0 || iTime < 0)
    return { error: true, signupUrl: SIGNUP, geo, updated: null, series: [] };

  // bucket every (geo, metric) → time → value
  const buckets = new Map<string, Map<string, number>>();
  for (const r of rows.slice(1)) {
    const cat = r[iCat];
    const dt = r[iDt];
    const g = r[iGeo];
    const time = r[iTime];
    const value = Number(r[iVal]);
    if (!time || !Number.isFinite(value)) continue;
    for (const m of METRICS) {
      if (cat === MATCHERS[m].cat && dt === MATCHERS[m].dt) {
        const k = bkey(g, m);
        let series = buckets.get(k);
        if (!series) buckets.set(k, (series = new Map()));
        series.set(time, value);
      }
    }
  }

  // use requested region if it has data, else fall back to national
  const hasGeo = (g: CensusGeo) => METRICS.some((m) => (buckets.get(bkey(g, m))?.size ?? 0) > 0);
  const usedGeo: CensusGeo = geo !== "US" && hasGeo(geo) ? geo : "US";

  let updated: string | null = null;
  const series: PermitSeries[] = METRICS.map((metric) => {
    const map = buckets.get(bkey(usedGeo, metric)) ?? new Map<string, number>();
    const points = [...map.entries()]
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => a.time.localeCompare(b.time));
    const last = points.at(-1) ?? null;
    if (last && (!updated || last.time > updated)) updated = last.time;
    let yoyPct: number | null = null;
    if (last) {
      const [y, m] = last.time.split("-");
      const prev = map.get(`${Number(y) - 1}-${m}`);
      if (prev && prev !== 0) yoyPct = Math.round(((last.value - prev) / prev) * 1000) / 10;
    }
    return { metric, latest: last?.value ?? null, yoyPct, points: points.slice(-24) };
  });

  return { signupUrl: SIGNUP, geo: usedGeo, updated, series };
}
