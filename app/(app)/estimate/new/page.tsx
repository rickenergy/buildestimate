import { createClient } from "@/lib/supabase/server";
import { NewEstimateTabs } from "@/components/new-estimate-tabs";

export default async function NewEstimatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("min_margin_pct")
    .eq("id", user!.id)
    .single();

  return <NewEstimateTabs minMarginPct={Number(profile?.min_margin_pct ?? 15)} />;
}
