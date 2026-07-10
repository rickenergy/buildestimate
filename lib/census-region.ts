/**
 * U.S. Census Bureau 4-region map. The `resconst` building-permit series is
 * published for the nation (US) and these four regions via geo_level_code, so
 * we can show the contractor their own region instead of only national.
 */

export type CensusGeo = "US" | "NO" | "MW" | "SO" | "WE";

const NORTHEAST = ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"];
const MIDWEST = ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"];
const SOUTH = [
  "DE", "FL", "GA", "MD", "NC", "SC", "VA", "DC", "WV",
  "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX",
];
const WEST = ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"];

const STATE_TO_REGION: Record<string, CensusGeo> = {};
for (const s of NORTHEAST) STATE_TO_REGION[s] = "NO";
for (const s of MIDWEST) STATE_TO_REGION[s] = "MW";
for (const s of SOUTH) STATE_TO_REGION[s] = "SO";
for (const s of WEST) STATE_TO_REGION[s] = "WE";

/** Map a 2-letter state code to its Census region, or "US" if unknown. */
export function regionForState(state: string | null | undefined): CensusGeo {
  if (!state) return "US";
  return STATE_TO_REGION[state.trim().toUpperCase()] ?? "US";
}
