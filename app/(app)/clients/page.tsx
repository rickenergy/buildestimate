import { createClient } from "@/lib/supabase/server";
import { ClientsList } from "@/components/clients-list";
import { ClientsKanban, type ClientWithEstimates } from "@/components/clients-kanban";
import { ClientsTabs } from "@/components/clients-tabs";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, estimates(id, title, total, status)")
    .order("updated_at", { ascending: false });

  const rows = (clients ?? []) as ClientWithEstimates[];

  return (
    <ClientsTabs
      kanban={<ClientsKanban clients={rows} />}
      list={<ClientsList clients={rows} />}
    />
  );
}
