import type { PriceEntry } from "./types";

export interface PriceHit {
  entry: PriceEntry;
  estimated: boolean; // true when falling back to a default/seed price
}

/**
 * Find the best price entry: all keywords must appear in the name.
 * User prices win over defaults. Returns null when nothing matches.
 */
export function findPrice(
  prices: PriceEntry[],
  trade: string,
  keywords: string[]
): PriceEntry | null {
  const kws = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  const candidates = prices.filter(
    (p) =>
      p.trade === trade &&
      kws.every((k) => p.name.toLowerCase().includes(k))
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Number(b.isUserPrice) - Number(a.isUserPrice));
  return candidates[0];
}

/** Loose match: any keyword hits, ranked by number of hits. */
export function findPriceLoose(
  prices: PriceEntry[],
  trade: string,
  query: string
): PriceEntry | null {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return null;
  let best: PriceEntry | null = null;
  let bestScore = 0;
  for (const p of prices) {
    if (p.trade !== trade) continue;
    const name = p.name.toLowerCase();
    let score = words.reduce((s, w) => s + (name.includes(w) ? 1 : 0), 0);
    if (score === 0) continue;
    score += p.isUserPrice ? 0.5 : 0;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export function fallbackPrice(
  trade: string,
  name: string,
  unit: string,
  material: number,
  labor: number
): PriceHit {
  return {
    entry: { trade, name, unit, material_cost: material, labor_cost: labor, isUserPrice: false },
    estimated: true,
  };
}
