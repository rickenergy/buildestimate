import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EstimateEditor } from "@/components/estimate-editor";
import type { Estimate, EstimateItem } from "@/lib/types";

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("*, clients(name)").eq("id", id).single(),
    supabase
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", id)
      .order("sort_order"),
    supabase.from("profiles").select("min_margin_pct").eq("id", user!.id).single(),
  ]);

  if (!estimate) notFound();

  return (
    <EstimateEditor
      estimate={estimate as Estimate & { clients: { name: string } | null }}
      items={(items ?? []) as EstimateItem[]}
      minMarginPct={Number(profile?.min_margin_pct ?? 15)}
    />
  );
}
