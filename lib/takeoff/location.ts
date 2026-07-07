import type { TakeoffResult } from "./types";

/**
 * Location cost index — RSMeans-style City Cost Index practice:
 * national average = 1.00; construction cost varies by metro (labor
 * rates, logistics) far more than by material. Resolution order:
 * 5-digit ZIP → 3-digit ZIP prefix (RSMeans CCI granularity) →
 * city name → state. Values are 2026 planning approximations.
 */

export interface LocationIndex {
  factor: number;
  label: string;
}

/** 3-digit ZIP prefix → factor (major metros; RSMeans CCI granularity). */
const ZIP3: Record<string, [number, string]> = {
  // Philadelphia metro — city vs suburbs priced apart
  "191": [1.15, "Philadelphia, PA"],
  "190": [1.08, "Southeastern PA suburbs"],
  "194": [1.1, "King of Prussia / Norristown, PA"],
  "193": [1.09, "West Chester / Paoli, PA"],
  // South Jersey
  "081": [1.06, "Camden, NJ"],
  "080": [1.1, "Cherry Hill / South Jersey, NJ"],
  "086": [1.08, "Trenton, NJ"],
  // North Jersey / NYC
  "070": [1.18, "Newark, NJ"],
  "071": [1.18, "Newark, NJ"],
  "100": [1.35, "Manhattan, NY"],
  "101": [1.35, "Manhattan, NY"],
  "112": [1.3, "Brooklyn, NY"],
  "104": [1.28, "Bronx, NY"],
  "110": [1.25, "Queens / Long Island, NY"],
  // Other majors
  "021": [1.2, "Boston, MA"],
  "606": [1.12, "Chicago, IL"],
  "770": [0.88, "Houston, TX"],
  "752": [0.9, "Dallas, TX"],
  "331": [0.92, "Miami, FL"],
  "328": [0.9, "Orlando, FL"],
  "300": [0.9, "Atlanta, GA"],
  "900": [1.2, "Los Angeles, CA"],
  "941": [1.35, "San Francisco, CA"],
  "981": [1.12, "Seattle, WA"],
  "850": [0.94, "Phoenix, AZ"],
  "802": [1.0, "Denver, CO"],
  "200": [1.1, "Washington, DC"],
  "212": [1.0, "Baltimore, MD"],
  "198": [1.05, "Wilmington, DE"],
};

const CITIES: Record<string, [number, string]> = {
  philadelphia: [1.15, "Philadelphia, PA"],
  "king of prussia": [1.1, "King of Prussia, PA"],
  norristown: [1.1, "Norristown, PA"],
  "west chester": [1.09, "West Chester, PA"],
  camden: [1.06, "Camden, NJ"],
  "cherry hill": [1.1, "Cherry Hill, NJ"],
  trenton: [1.08, "Trenton, NJ"],
  newark: [1.18, "Newark, NJ"],
  "new york": [1.35, "New York, NY"],
  brooklyn: [1.3, "Brooklyn, NY"],
  boston: [1.2, "Boston, MA"],
  chicago: [1.12, "Chicago, IL"],
  houston: [0.88, "Houston, TX"],
  dallas: [0.9, "Dallas, TX"],
  miami: [0.92, "Miami, FL"],
  orlando: [0.9, "Orlando, FL"],
  atlanta: [0.9, "Atlanta, GA"],
  "los angeles": [1.2, "Los Angeles, CA"],
  "san francisco": [1.35, "San Francisco, CA"],
  seattle: [1.12, "Seattle, WA"],
  phoenix: [0.94, "Phoenix, AZ"],
  denver: [1.0, "Denver, CO"],
  washington: [1.1, "Washington, DC"],
  baltimore: [1.0, "Baltimore, MD"],
  wilmington: [1.05, "Wilmington, DE"],
};

const STATES: Record<string, number> = {
  AL: 0.84, AK: 1.22, AZ: 0.92, AR: 0.82, CA: 1.22, CO: 0.96, CT: 1.12,
  DE: 1.04, FL: 0.88, GA: 0.87, HI: 1.24, ID: 0.9, IL: 1.05, IN: 0.92,
  IA: 0.9, KS: 0.88, KY: 0.9, LA: 0.86, ME: 0.96, MD: 1.02, MA: 1.18,
  MI: 0.98, MN: 1.04, MS: 0.8, MO: 0.96, MT: 0.92, NE: 0.88, NV: 1.02,
  NH: 1.0, NJ: 1.14, NM: 0.88, NY: 1.2, NC: 0.85, ND: 0.94, OH: 0.96,
  OK: 0.84, OR: 1.06, PA: 1.04, RI: 1.08, SC: 0.84, SD: 0.86, TN: 0.86,
  TX: 0.88, UT: 0.92, VT: 0.98, VA: 0.92, WA: 1.08, WV: 0.9, WI: 1.0,
  WY: 0.9, DC: 1.1,
};

/** Resolve an address / ZIP / city string to a cost index. */
export function locationIndex(query: string | undefined | null): LocationIndex {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return { factor: 1, label: "" };

  // 5-digit ZIP anywhere in the text → 3-digit prefix
  const zip = q.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zip) {
    const hit = ZIP3[zip[1].slice(0, 3)];
    if (hit) return { factor: hit[0], label: hit[1] };
  }

  // Known city names (longest match wins: "king of prussia" before "prussia")
  let best: [number, string] | null = null;
  let bestLen = 0;
  for (const [name, val] of Object.entries(CITIES)) {
    if (q.includes(name) && name.length > bestLen) {
      best = val;
      bestLen = name.length;
    }
  }
  if (best) return { factor: best[0], label: best[1] };

  // State: 2-letter code as its own word. Last match wins — US addresses
  // end with the state, and English words like "in"/"or"/"me" false-match.
  const matches = [
    ...q
      .toUpperCase()
      .matchAll(/\b(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/g),
  ];
  const st = matches.at(-1)?.[1];
  if (st && STATES[st]) {
    return { factor: STATES[st], label: st };
  }

  return { factor: 1, label: "" };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Scale a takeoff by the location index. Labor-type costs move with the
 * full factor; materials move ~60% of the deviation (freight/markup vary
 * less than local labor rates — RSMeans splits mat/inst the same way).
 */
export function applyLocationFactor(takeoff: TakeoffResult, factor: number): TakeoffResult {
  if (!factor || factor === 1) return takeoff;
  const matFactor = 1 + (factor - 1) * 0.6;

  const items = takeoff.items.map((item) => {
    const f = item.kind === "material" ? matFactor : factor;
    return {
      ...item,
      unit_cost: round2(item.unit_cost * f),
      total: round2(item.total * f),
    };
  });

  const sum = (kinds: string[]) =>
    round2(items.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + i.total, 0));

  return {
    ...takeoff,
    items,
    material_cost: sum(["material"]),
    labor_cost: sum(["labor", "other"]),
    demo_cost: sum(["demo", "disposal"]),
  };
}
