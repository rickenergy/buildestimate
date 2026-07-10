/**
 * Parse a free-text US address (the estimate `location` field) into structured
 * zip / city / state so we can study demand by area. Deliberately forgiving —
 * returns whatever it can find, nulls for the rest. No I/O, no AI.
 *
 * Handles the common shapes our autocomplete + manual entry produce:
 *   "123 Main St, Orlando, FL 32801"
 *   "Orlando, FL 32801"
 *   "32801"
 *   "Miami, FL"
 */
export interface ParsedAddress {
  zip: string | null;
  city: string | null;
  state: string | null;
}

const STATE_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

export function parseUsAddress(location: string | null | undefined): ParsedAddress {
  const empty: ParsedAddress = { zip: null, city: null, state: null };
  if (!location) return empty;
  const raw = location.trim();
  if (!raw) return empty;

  // ZIP: first 5-digit group (optionally ZIP+4)
  const zipMatch = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : null;

  // STATE: a 2-letter token that is a real state abbreviation
  let state: string | null = null;
  const tokens = raw.split(/[\s,]+/).filter(Boolean);
  for (const tok of tokens) {
    const up = tok.toUpperCase();
    if (up.length === 2 && STATE_ABBR.has(up)) {
      state = up;
      break;
    }
  }

  // CITY: the comma-segment immediately before the "STATE ZIP" (or before state).
  let city: string | null = null;
  const segs = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (segs.length >= 2) {
    // find the segment that starts with the state abbr, city is the one before it
    const stateSegIdx = segs.findIndex((s) =>
      state ? s.toUpperCase().startsWith(state) : false
    );
    if (stateSegIdx > 0) {
      city = segs[stateSegIdx - 1];
    } else if (segs.length >= 2) {
      // "City, ST ZIP" with no explicit match, or "Street, City" — take 2nd-to-last
      const candidate = segs[segs.length - 2];
      if (candidate && !/^\d/.test(candidate)) city = candidate;
    }
  }
  // strip a leading street number if city accidentally captured a street line
  if (city && /\d/.test(city) && segs.length < 3) city = null;

  return { zip, city, state };
}
