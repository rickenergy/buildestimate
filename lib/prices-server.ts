import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceEntry } from "@/lib/takeoff/types";

/**
 * Merge the user's price book over the default seed prices.
 * A user item with the same (trade, name) replaces the default.
 */
export async function loadPrices(
  supabase: SupabaseClient,
  trade?: string
): Promise<PriceEntry[]> {
  let defaultsQuery = supabase.from("default_price_items").select("*");
  let userQuery = supabase.from("price_items").select("*");
  if (trade) {
    defaultsQuery = defaultsQuery.eq("trade", trade);
    userQuery = userQuery.eq("trade", trade);
  }

  const [{ data: defaults }, { data: userItems }] = await Promise.all([
    defaultsQuery,
    userQuery,
  ]);

  const entries = new Map<string, PriceEntry>();
  for (const d of defaults ?? []) {
    entries.set(`${d.trade}|${d.name.toLowerCase()}`, {
      trade: d.trade,
      name: d.name,
      unit: d.unit,
      material_cost: Number(d.material_cost),
      labor_cost: Number(d.labor_cost),
      isUserPrice: false,
    });
  }
  for (const u of userItems ?? []) {
    entries.set(`${u.trade}|${u.name.toLowerCase()}`, {
      trade: u.trade,
      name: u.name,
      unit: u.unit,
      material_cost: Number(u.material_cost),
      labor_cost: Number(u.labor_cost),
      isUserPrice: true,
    });
  }
  return [...entries.values()];
}
