import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EstimateEditor } from "@/components/estimate-editor";
import { MarketInsightsCard } from "@/components/market-insights";
import { JobCostCard } from "@/components/job-cost-card";
import type { JobTransaction } from "@/app/actions/finance";
import type { MarketInsights } from "@/app/actions/market";
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

  const [{ data: estimate }, { data: items }, { data: profile }, { data: transactions }] =
    await Promise.all([
      supabase.from("estimates").select("*, clients(name)").eq("id", id).single(),
      supabase
        .from("estimate_items")
        .select("*")
        .eq("estimate_id", id)
        .order("sort_order"),
      supabase.from("profiles").select("min_margin_pct").eq("id", user!.id).single(),
      supabase
        .from("job_transactions")
        .select("*")
        .eq("estimate_id", id)
        .order("occurred_at", { ascending: false }),
    ]);

  if (!estimate) notFound();

  return (
    <>
      <EstimateEditor
        estimate={estimate as Estimate & { clients: { name: string } | null }}
        items={(items ?? []) as EstimateItem[]}
        minMarginPct={Number(profile?.min_margin_pct ?? 15)}
      />
      <div className="space-y-4 px-4 pb-8">
        <JobCostCard
          estimateId={id}
          contractTotal={Number(estimate.total)}
          estimatedCost={
            Number(estimate.material_cost) +
            Number(estimate.labor_cost) +
            Number(estimate.demo_cost)
          }
          transactions={(transactions ?? []) as JobTransaction[]}
        />
        <MarketInsightsCard
          estimateId={id}
          initial={(estimate.market_insights as MarketInsights | null) ?? null}
        />
      </div>
    </>
  );
}
