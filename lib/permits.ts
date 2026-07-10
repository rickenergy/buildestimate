import "server-only";

/**
 * National residential-construction pulse from the U.S. Census Bureau
 * "New Residential Construction" time series (EITS `resconst`).
 *
 * Sub-national (state/metro) permit data is NOT available through a stable
 * free API — the Census only publishes it as text files at moving URLs — so
 * this is a national, seasonally-adjusted macro signal (permits + starts),
 * the strongest "is residential demand rising or cooling" read we can pull
 * reliably. Requires a free CENSUS_API_KEY (https://api.census.gov/data/key_signup.html).
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
  updated: string | null; // latest time slot, "YYYY-MM"
  series: PermitSeries[];
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Which Census category_code / data_type_code combo feeds each metric. */
const MATCHERS: Record<PermitMetric, (cat: string, dt: string) => boolean> = {
  permits_total: (c, d) => /permit/i.test(c) && /total/i.test(d),
  permits_single: (c, d) => /permit/i.test(c) && /(single|1[\s_-]?unit)/i.test(d),
  starts_total: (c, d) => /start/i.test(c) && /total/i.test(d),
};

export async function getPermitPulse(): Promise<PermitPulse> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) return { needsKey: true, signupUrl: SIGNUP, updated: null, series: [] };

  const now = new Date();
  const toY = now.getUTCFullYear();
  const toM = now.getUTCMonth() + 1;
  const timeRange = `from ${toY - 2}-01 to ${toY}-${pad(toM)}`;
  const url =
    `${BASE}?get=cell_value,category_code,data_type_code,seasonally_adj` +
    `&time=${encodeURIComponent(timeRange)}&seasonally_adj=yes&key=${key}`;

  let rows: string[][];
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return { error: true, signupUrl: SIGNUP, updated: null, series: [] };
    rows = (await res.json()) as string[][];
  } catch {
    return { error: true, signupUrl: SIGNUP, updated: null, series: [] };
  }
  if (!Array.isArray(rows) || rows.length < 2)
    return { error: true, signupUrl: SIGNUP, updated: null, series: [] };

  const header = rows[0];
  const col = (name: string) => header.indexOf(name);
  const iVal = col("cell_value");
  const iCat = col("category_code");
  const iDt = col("data_type_code");
  const iTime = col("time");
  if (iVal < 0 || iCat < 0 || iDt < 0 || iTime < 0)
    return { error: true, signupUrl: SIGNUP, updated: null, series: [] };

  const metrics: PermitMetric[] = ["permits_total", "permits_single", "starts_total"];
  const buckets: Record<PermitMetric, Map<string, number>> = {
    permits_total: new Map(),
    permits_single: new Map(),
    starts_total: new Map(),
  };

  for (const r of rows.slice(1)) {
    const cat = r[iCat] ?? "";
    const dt = r[iDt] ?? "";
    const time = r[iTime] ?? "";
    const value = Number(r[iVal]);
    if (!time || !Number.isFinite(value)) continue;
    for (const m of metrics) {
      if (MATCHERS[m](cat, dt)) buckets[m].set(time, value);
    }
  }

  let updated: string | null = null;
  const series: PermitSeries[] = metrics.map((metric) => {
    const points = [...buckets[metric].entries()]
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => a.time.localeCompare(b.time));
    const last = points.at(-1) ?? null;
    if (last && (!updated || last.time > updated)) updated = last.time;
    let yoyPct: number | null = null;
    if (last) {
      const [y, m] = last.time.split("-");
      const prevKey = `${Number(y) - 1}-${m}`;
      const prev = buckets[metric].get(prevKey);
      if (prev && prev !== 0) yoyPct = Math.round(((last.value - prev) / prev) * 1000) / 10;
    }
    return { metric, latest: last?.value ?? null, yoyPct, points: points.slice(-24) };
  });

  return { signupUrl: SIGNUP, updated, series };
}
