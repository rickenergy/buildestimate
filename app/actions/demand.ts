"use server";

import { createClient } from "@/lib/supabase/server";

/** Won vs lost — kept consistent with the /home dashboard buckets. */
const WON_STATUSES = ["approved", "job"];

export interface AreaDemand {
  key: string; // zip or "City, ST"
  label: string;
  zip: string | null;
  count: number;
  value: number; // sum of totals
  won: number;
  lost: number;
  winRate: number | null; // 0-100, null if nothing decided
}

export interface TradeDemand {
  trade: string;
  count: number;
  value: number;
}

export interface DemandReport {
  areas: AreaDemand[];
  trades: TradeDemand[];
  totalCount: number;
  locatedCount: number; // estimates that carry an area
  topArea: AreaDemand | null;
}

export async function getDemandReport(): Promise<DemandReport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { areas: [], trades: [], totalCount: 0, locatedCount: 0, topArea: null };

  const { data } = await supabase
    .from("estimates")
    .select("trade, status, total, zip, city, state")
    .eq("user_id", user.id);

  const rows = data ?? [];
  const areaMap = new Map<string, AreaDemand>();
  const tradeMap = new Map<string, TradeDemand>();
  let locatedCount = 0;

  for (const r of rows) {
    const total = Number(r.total) || 0;
    const trade = String(r.trade ?? "other");

    // by trade (always)
    const td = tradeMap.get(trade) ?? { trade, count: 0, value: 0 };
    td.count += 1;
    td.value += total;
    tradeMap.set(trade, td);

    // by area (only when we have a zip or city)
    const zip = r.zip ? String(r.zip) : null;
    const city = r.city ? String(r.city) : null;
    const state = r.state ? String(r.state) : null;
    if (!zip && !city) continue;
    locatedCount += 1;

    const key = zip ?? `${city}-${state ?? ""}`;
    const label = city ? `${city}${state ? ", " + state : ""}${zip ? " " + zip : ""}` : zip!;
    const ad =
      areaMap.get(key) ??
      { key, label, zip, count: 0, value: 0, won: 0, lost: 0, winRate: null };
    ad.count += 1;
    ad.value += total;
    if (WON_STATUSES.includes(String(r.status))) ad.won += 1;
    else if (r.status === "lost") ad.lost += 1;
    areaMap.set(key, ad);
  }

  const areas = [...areaMap.values()]
    .map((a) => {
      const decided = a.won + a.lost;
      return { ...a, winRate: decided > 0 ? Math.round((a.won / decided) * 100) : null };
    })
    .sort((a, b) => b.value - a.value);

  const trades = [...tradeMap.values()].sort((a, b) => b.value - a.value);

  return {
    areas,
    trades,
    totalCount: rows.length,
    locatedCount,
    topArea: areas[0] ?? null,
  };
}
