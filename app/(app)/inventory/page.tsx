import { createClient } from "@/lib/supabase/server";
import { InventoryList } from "@/components/inventory-list";
import type { InventoryItemWithPrices, ItemStorePrice, RetailStore } from "@/lib/types";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [items, prices, stores] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("user_id", user!.id).order("name"),
    supabase.from("item_store_prices").select("*").eq("user_id", user!.id),
    supabase.from("retail_stores").select("*").eq("user_id", user!.id).order("name"),
  ]);

  const byItem = new Map<string, ItemStorePrice[]>();
  for (const p of (prices.data ?? []) as ItemStorePrice[]) {
    const list = byItem.get(p.inventory_item_id) ?? [];
    list.push(p);
    byItem.set(p.inventory_item_id, list);
  }

  const rows: InventoryItemWithPrices[] = ((items.data ?? []) as InventoryItemWithPrices[]).map((it) => ({
    ...it,
    // cheapest first
    prices: (byItem.get(it.id) ?? []).sort((a, b) => Number(a.price) - Number(b.price)),
  }));

  return <InventoryList rows={rows} stores={(stores.data ?? []) as RetailStore[]} />;
}
