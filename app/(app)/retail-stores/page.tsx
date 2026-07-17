import { createClient } from "@/lib/supabase/server";
import { RetailStoresList } from "@/components/retail-stores-list";
import type { RetailStore } from "@/lib/types";

export default async function RetailStoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("retail_stores")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");
  return <RetailStoresList rows={(data ?? []) as RetailStore[]} />;
}
