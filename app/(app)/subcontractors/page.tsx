import { createClient } from "@/lib/supabase/server";
import { SubcontractorsList } from "@/components/subcontractors-list";
import type { Subcontractor } from "@/lib/types";

export default async function SubcontractorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  return <SubcontractorsList rows={(data ?? []) as Subcontractor[]} />;
}
