import { createClient } from "@/lib/supabase/server";
import { BlueprintsList } from "@/components/blueprints-list";
import type { BlueprintRow } from "@/app/actions/blueprints";

export default async function BlueprintsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("blueprints")
    .select("id, name, file_path, is_image, status, analysis, answers, chosen_trade, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <BlueprintsList rows={(data ?? []) as BlueprintRow[]} />;
}
