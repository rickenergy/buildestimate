import { createClient } from "@/lib/supabase/server";
import { InventoryList } from "@/components/inventory-list";
import type { InventoryItem } from "@/lib/types";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  return <InventoryList rows={(data ?? []) as InventoryItem[]} />;
}
