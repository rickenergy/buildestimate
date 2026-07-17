import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LearnItem {
  name: string;
  category: string; // labor | material | equipment | other
  unit: string;
  unit_cost: number;
}

/**
 * Grow the price catalog automatically: any AI-generated line item whose name
 * isn't already in the catalog (default seed or the owner's own prices) gets
 * saved to price_items so it's reusable next time. Deduped by trade+name.
 * Best-effort — never throws into the estimate flow.
 */
export async function learnCatalogItems(
  supabase: SupabaseClient,
  userId: string,
  trade: string,
  items: LearnItem[]
): Promise<number> {
  try {
    const [{ data: defaults }, { data: mine }] = await Promise.all([
      supabase.from("default_price_items").select("name").eq("trade", trade),
      supabase.from("price_items").select("name").eq("user_id", userId).eq("trade", trade),
    ]);
    const known = new Set(
      [...(defaults ?? []), ...(mine ?? [])].map((r) => String(r.name).toLowerCase().trim())
    );

    const seen = new Set<string>();
    const rows: {
      user_id: string;
      trade: string;
      name: string;
      unit: string;
      material_cost: number;
      labor_cost: number;
    }[] = [];

    for (const li of items) {
      const key = li.name?.toLowerCase().trim();
      if (!key || !(li.unit_cost > 0) || known.has(key) || seen.has(key)) continue;
      seen.add(key);
      const isLabor = li.category === "labor";
      const cost = Math.round(Number(li.unit_cost) * 100) / 100;
      rows.push({
        user_id: userId,
        trade,
        name: li.name.trim(),
        unit: li.unit || "ea",
        material_cost: isLabor ? 0 : cost,
        labor_cost: isLabor ? cost : 0,
      });
    }

    if (rows.length === 0) return 0;
    await supabase.from("price_items").insert(rows);
    return rows.length;
  } catch {
    return 0;
  }
}
