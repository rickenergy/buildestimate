import { createClient } from "@/lib/supabase/server";
import { IncidentsView } from "@/components/incidents-view";
import type { Incident, Subcontractor } from "@/lib/types";

export default async function IncidentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: incidents }, { data: subs }] = await Promise.all([
    supabase
      .from("incidents")
      .select("*, estimates(title)")
      .eq("user_id", user!.id)
      .order("status")
      .order("created_at", { ascending: false }),
    supabase.from("subcontractors").select("*").eq("user_id", user!.id).order("name"),
  ]);

  return (
    <IncidentsView
      rows={(incidents ?? []) as Incident[]}
      subs={(subs ?? []) as Subcontractor[]}
    />
  );
}
