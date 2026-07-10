import { createClient } from "@/lib/supabase/server";
import { NewEstimateTabs } from "@/components/new-estimate-tabs";
import type { EstimateType } from "@/lib/types";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; project?: string }>;
}) {
  const { type, project } = await searchParams;
  const estimateType: EstimateType | null =
    type === "commercial" || type === "residential" ? type : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("min_margin_pct")
    .eq("id", user!.id)
    .single();

  return (
    <NewEstimateTabs
      minMarginPct={Number(profile?.min_margin_pct ?? 15)}
      estimateType={estimateType}
      projectId={project ?? null}
    />
  );
}
