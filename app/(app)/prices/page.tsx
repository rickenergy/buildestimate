import { createClient } from "@/lib/supabase/server";
import { loadPrices } from "@/lib/prices-server";
import { PricesList } from "@/components/prices-list";

export default async function PricesPage() {
  const supabase = await createClient();
  const prices = await loadPrices(supabase);

  return <PricesList prices={prices} />;
}
