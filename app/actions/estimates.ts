"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTakeoff, computeTotals } from "@/lib/takeoff";
import { loadPrices } from "@/lib/prices-server";
import type { ComputedItem, EstimateTotals, TakeoffInput, TakeoffResult } from "@/lib/takeoff/types";
import type { ItemKind } from "@/lib/types";

interface SaveEstimatePayload {
  input: {
    trade: string;
    title: string;
    quality_tier?: "basic" | "standard" | "premium";
    conditions?: Record<string, unknown>;
    location?: string;
    start_timeframe?: string;
    client_name?: string;
    project_meta?: Record<string, unknown>;
  };
  takeoff: TakeoffResult;
  totals: EstimateTotals;
}

/** Deterministic takeoff from the manual form — no AI involved. */
export async function computeEstimate(input: TakeoffInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("overhead_pct, profit_pct, tax_pct, min_margin_pct")
    .eq("id", user.id)
    .single();

  const prices = await loadPrices(supabase, input.trade);
  const takeoff = computeTakeoff(input, prices);
  const totals = computeTotals(
    takeoff.items,
    Number(profile?.overhead_pct ?? 10),
    Number(profile?.profit_pct ?? 20),
    Number(profile?.tax_pct ?? 0),
    Number(profile?.min_margin_pct ?? 15)
  );

  return {
    input: {
      trade: input.trade,
      title: input.title ?? "",
      quality_tier: input.quality_tier,
      conditions: (input.conditions ?? {}) as Record<string, unknown>,
      client_name: input.client_name,
    },
    takeoff,
    totals,
  };
}

export interface ProjectComputeResult {
  payload: SaveEstimatePayload;
  perTrade: { trade: string; takeoff: TakeoffResult }[];
}

/**
 * Multi-trade project takeoff from the smart wizard.
 * Each trade is computed by the deterministic engine, then aggregated into
 * one estimate (umbrella trade "remodeling" when more than one trade).
 */
export async function computeProject(
  inputs: TakeoffInput[],
  meta: {
    title: string;
    area_sqft: number;
    quality_tier?: "basic" | "standard" | "premium";
    conditions?: Record<string, unknown>;
    client_name?: string;
    location?: string;
    project_meta?: Record<string, unknown>;
  }
): Promise<ProjectComputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (inputs.length === 0) throw new Error("No work selected");

  const { data: profile } = await supabase
    .from("profiles")
    .select("overhead_pct, profit_pct, tax_pct, min_margin_pct")
    .eq("id", user.id)
    .single();

  const perTrade: { trade: string; takeoff: TakeoffResult }[] = [];
  for (const input of inputs) {
    const prices = await loadPrices(supabase, input.trade);
    perTrade.push({ trade: input.trade, takeoff: computeTakeoff(input, prices) });
  }

  const allItems = perTrade.flatMap((t) => t.takeoff.items);
  const totals = computeTotals(
    allItems,
    Number(profile?.overhead_pct ?? 10),
    Number(profile?.profit_pct ?? 20),
    Number(profile?.tax_pct ?? 0),
    Number(profile?.min_margin_pct ?? 15)
  );

  const sum = (kinds: string[]) =>
    Math.round(
      allItems.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + i.total, 0) * 100
    ) / 100;

  const aggregated: TakeoffResult = {
    items: allItems,
    area_sqft: meta.area_sqft,
    waste_pct: Math.round(
      perTrade.reduce((s, t) => s + t.takeoff.waste_pct, 0) / perTrade.length
    ),
    crew_size: Math.max(...perTrade.map((t) => t.takeoff.crew_size)),
    est_days: Math.round(perTrade.reduce((s, t) => s + t.takeoff.est_days, 0) * 2) / 2,
    material_cost: sum(["material"]),
    labor_cost: sum(["labor", "other"]),
    demo_cost: sum(["demo", "disposal"]),
  };

  return {
    payload: {
      input: {
        trade: inputs.length === 1 ? inputs[0].trade : "remodeling",
        title: meta.title,
        quality_tier: meta.quality_tier,
        conditions: meta.conditions ?? {},
        location: meta.location,
        client_name: meta.client_name,
        project_meta: meta.project_meta,
      },
      takeoff: aggregated,
      totals,
    },
    perTrade,
  };
}

export async function saveEstimate(payload: SaveEstimatePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("overhead_pct, profit_pct, tax_pct")
    .eq("id", user.id)
    .single();

  // Find or create the client by name
  let clientId: string | null = null;
  const clientName = payload.input.client_name?.trim();
  if (clientName) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", clientName)
      .limit(1)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("clients")
        .insert({ user_id: user.id, name: clientName })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  const { takeoff, totals, input } = payload;

  const { data: estimate, error } = await supabase
    .from("estimates")
    .insert({
      user_id: user.id,
      client_id: clientId,
      title: input.title,
      trade: input.trade,
      status: "ready",
      area_sqft: takeoff.area_sqft,
      quality_tier: input.quality_tier ?? "standard",
      conditions: input.conditions ?? {},
      location: input.location ?? null,
      start_timeframe: input.start_timeframe ?? null,
      material_cost: takeoff.material_cost,
      labor_cost: takeoff.labor_cost,
      demo_cost: takeoff.demo_cost,
      overhead_pct: profile?.overhead_pct ?? 10,
      profit_pct: profile?.profit_pct ?? 20,
      tax_pct: profile?.tax_pct ?? 0,
      total: totals.total,
      margin_score: totals.margin_score,
      crew_size: takeoff.crew_size,
      est_days: takeoff.est_days,
      project_meta: input.project_meta ?? null,
    })
    .select("id")
    .single();

  if (error || !estimate) throw new Error(error?.message ?? "Failed to save");

  const items = takeoff.items.map((item, i) => ({
    estimate_id: estimate.id,
    user_id: user.id,
    kind: item.kind,
    description: item.description,
    qty: item.qty,
    unit: item.unit,
    unit_cost: item.unit_cost,
    total: item.total,
    is_estimated_price: item.is_estimated_price,
    sort_order: i,
  }));
  const { error: itemsError } = await supabase.from("estimate_items").insert(items);
  if (itemsError) throw new Error(itemsError.message);

  revalidatePath("/");
  revalidatePath("/estimates");
  return { id: estimate.id as string };
}

/** Recompute estimate totals from current items and settings. */
async function recalc(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("overhead_pct, profit_pct, tax_pct").eq("id", estimateId).single(),
    supabase.from("estimate_items").select("kind, total").eq("estimate_id", estimateId),
    supabase.from("profiles").select("min_margin_pct").eq("id", user.id).single(),
  ]);
  if (!estimate || !items) throw new Error("Not found");

  const computed = items as { kind: ItemKind; total: number }[];
  const asItems: ComputedItem[] = computed.map((i) => ({
    kind: i.kind,
    description: "",
    qty: 1,
    unit: "ea",
    unit_cost: Number(i.total),
    total: Number(i.total),
    is_estimated_price: false,
  }));

  const totals = computeTotals(
    asItems,
    Number(estimate.overhead_pct),
    Number(estimate.profit_pct),
    Number(estimate.tax_pct),
    Number(profile?.min_margin_pct ?? 15)
  );

  const sum = (kinds: string[]) =>
    computed.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + Number(i.total), 0);

  await supabase
    .from("estimates")
    .update({
      material_cost: sum(["material"]),
      labor_cost: sum(["labor", "other"]),
      demo_cost: sum(["demo", "disposal"]),
      total: totals.total,
      margin_score: totals.margin_score,
    })
    .eq("id", estimateId);

  revalidatePath(`/estimate/${estimateId}`);
}

export async function updateEstimateItem(
  estimateId: string,
  itemId: string,
  fields: { description?: string; qty?: number; unit_cost?: number }
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = { ...fields };
  if (fields.qty !== undefined || fields.unit_cost !== undefined) {
    const { data: item } = await supabase
      .from("estimate_items")
      .select("qty, unit_cost")
      .eq("id", itemId)
      .single();
    const qty = fields.qty ?? Number(item?.qty ?? 1);
    const unitCost = fields.unit_cost ?? Number(item?.unit_cost ?? 0);
    update.total = Math.round(qty * unitCost * 100) / 100;
    if (fields.unit_cost !== undefined) update.is_estimated_price = false;
  }
  await supabase.from("estimate_items").update(update).eq("id", itemId);
  await recalc(estimateId);
}

export async function deleteEstimateItem(estimateId: string, itemId: string) {
  const supabase = await createClient();
  await supabase.from("estimate_items").delete().eq("id", itemId);
  await recalc(estimateId);
}

export async function addEstimateItem(
  estimateId: string,
  item: { kind: ItemKind; description: string; qty: number; unit: string; unit_cost: number }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase.from("estimate_items").insert({
    estimate_id: estimateId,
    user_id: user.id,
    ...item,
    total: Math.round(item.qty * item.unit_cost * 100) / 100,
    sort_order: 999,
  });
  await recalc(estimateId);
}

export async function updateEstimatePcts(
  estimateId: string,
  fields: { overhead_pct?: number; profit_pct?: number; tax_pct?: number }
) {
  const supabase = await createClient();
  await supabase.from("estimates").update(fields).eq("id", estimateId);
  await recalc(estimateId);
}

export async function updateEstimateStatus(estimateId: string, status: string) {
  const supabase = await createClient();
  await supabase.from("estimates").update({ status }).eq("id", estimateId);
  revalidatePath(`/estimate/${estimateId}`);
  revalidatePath("/estimates");
  revalidatePath("/");
}

export async function deleteEstimate(estimateId: string) {
  const supabase = await createClient();
  await supabase.from("estimates").delete().eq("id", estimateId);
  revalidatePath("/estimates");
  revalidatePath("/");
}
