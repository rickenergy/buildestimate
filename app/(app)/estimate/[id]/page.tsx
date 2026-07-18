import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { loadPrices } from "@/lib/prices-server";
import { EstimateEditor } from "@/components/estimate-editor";
import { MarketInsightsCard } from "@/components/market-insights";
import { JobCostCard } from "@/components/job-cost-card";
import { EstimateShare } from "@/components/estimate-share";
import { TasksCard } from "@/components/tasks-card";
import { RelatedWorkCard } from "@/components/related-work-card";
import { ServiceTasksCard } from "@/components/service-tasks-card";
import { getTaskMapping } from "@/lib/standards";
import { SafetyChecklistCard } from "@/components/safety-checklist-card";
import { BillingCard } from "@/components/billing-card";
import { JobPhotosCard } from "@/components/job-photos-card";
import { signPhotos, type JobPhoto } from "@/app/actions/photos";
import type { JobTask } from "@/app/actions/tasks";
import type { ChangeOrder, Invoice } from "@/app/actions/billing";
import { DeleteEstimateButton } from "@/components/delete-estimate-button";
import { ShareWithSubs } from "@/components/share-with-subs";
import type { ShareRow } from "@/app/actions/shares";
import type { Subcontractor } from "@/lib/types";
import type { JobTransaction } from "@/lib/finance";
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
      supabase.from("profiles").select("min_margin_pct, language").eq("id", user!.id).single(),
      supabase
        .from("job_transactions")
        .select("*")
        .eq("estimate_id", id)
        .order("occurred_at", { ascending: false }),
    ]);

  const [{ data: invoices }, { data: changeOrders }] = await Promise.all([
    supabase.from("invoices").select("*").eq("estimate_id", id).order("created_at"),
    supabase.from("change_orders").select("*").eq("estimate_id", id).order("created_at"),
  ]);

  const { data: jobTasks } = await supabase
    .from("job_tasks")
    .select("*")
    .eq("estimate_id", id)
    .order("created_at");

  const { data: safetyRows } = await supabase
    .from("safety_checks")
    .select("item_key")
    .eq("estimate_id", id);
  const safetyDone = (safetyRows ?? []).map((r) => r.item_key as string);

  const { data: jobPhotos } = await supabase
    .from("job_photos")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order")
    .order("created_at");
  const signed = await signPhotos((jobPhotos ?? []) as JobPhoto[]);
  const beforePhotos = signed.filter((p) => p.phase === "before");
  const afterPhotos = signed.filter((p) => p.phase === "after");

  const { data: proposal } = await supabase
    .from("proposals")
    .select("token")
    .eq("estimate_id", id)
    .maybeSingle();

  const { data: company } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", user!.id)
    .single();

  const [{ data: subs }, { data: shareRows }] = await Promise.all([
    supabase.from("subcontractors").select("*").eq("user_id", user!.id).order("name"),
    supabase
      .from("estimate_shares")
      .select("*, subcontractors(name)")
      .eq("estimate_id", id)
      .order("queue_order"),
  ]);
  const shares = (shareRows ?? []).map((s) => ({
    ...s,
    sub_name: (s.subcontractors as { name: string } | null)?.name ?? null,
  })) as ShareRow[];

  if (!estimate) notFound();

  const t = getDict(profile?.language as string | undefined);
  const catalog = await loadPrices(supabase);

  return (
    <>
      <EstimateEditor
        estimate={estimate as Estimate & { clients: { name: string } | null }}
        items={(items ?? []) as EstimateItem[]}
        minMarginPct={Number(profile?.min_margin_pct ?? 15)}
        catalog={catalog}
      />
      <div className="space-y-4 px-4 pb-8">
        <EstimateShare
          estimateId={id}
          title={estimate.title}
          total={Number(estimate.total)}
          areaSqft={estimate.area_sqft}
          estDays={estimate.est_days}
          companyName={company?.company_name ?? null}
          proposalToken={proposal?.token ?? null}
        />
        <TasksCard
          estimateId={id}
          tasks={(jobTasks ?? []) as JobTask[]}
          startDate={estimate.start_date ?? null}
          endDate={estimate.end_date ?? null}
        />
        <BillingCard
          estimateId={id}
          contractTotal={Number(estimate.total)}
          invoices={(invoices ?? []) as Invoice[]}
          changeOrders={(changeOrders ?? []) as ChangeOrder[]}
        />
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
        <JobPhotosCard
          estimateId={id}
          before={beforePhotos}
          after={afterPhotos}
        />
        <ShareWithSubs
          estimateId={id}
          subs={(subs ?? []) as Subcontractor[]}
          shares={shares}
        />
        <ServiceTasksCard
          trade={estimate.trade}
          initialTasks={getTaskMapping(estimate.trade)}
        />
        <SafetyChecklistCard trade={estimate.trade} estimateId={id} initialDone={safetyDone} />
        <RelatedWorkCard trade={estimate.trade} />
        <MarketInsightsCard
          estimateId={id}
          initial={(estimate.market_insights as MarketInsights | null) ?? null}
        />
        <Link
          href="/estimates"
          className="press flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium shadow-xs hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> {t.common.back}
        </Link>
        <DeleteEstimateButton estimateId={id} />
      </div>
    </>
  );
}
