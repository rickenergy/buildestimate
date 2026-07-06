import { createClient } from "@/lib/supabase/server";
import { ClientsList } from "@/components/clients-list";
import type { ClientRow } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, estimates(id, title, total, status)")
    .order("updated_at", { ascending: false });

  return (
    <ClientsList
      clients={(clients ?? []) as (ClientRow & {
        estimates: { id: string; title: string; total: number; status: string }[];
      })[]}
    />
  );
}
