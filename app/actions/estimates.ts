"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeTakeoff, computeTotals } from "@/lib/takeoff";
import { locationIndex, applyLocationFactor } from "@/lib/takeoff/location";
import { parseUsAddress } from "@/lib/geo";
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
    status?: string;
    project_id?: string | null;
    estimate_type?: "residential" | "commercial" | null;
    materials_included?: boolean | null;
    advisor_answers?: Record<string, unknown> | null;
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
  const loc = locationIndex(input.location);
  const takeoff = applyLocationFactor(computeTakeoff(input, prices), loc.factor);
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
      location: input.location,
      client_name: input.client_name,
      project_meta: loc.label
        ? { location_factor: loc.factor, location_label: loc.label }
        : undefined,
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

  const loc = locationIndex(meta.location);
  const perTrade: { trade: string; takeoff: TakeoffResult }[] = [];
  for (const input of inputs) {
    const prices = await loadPrices(supabase, input.trade);
    perTrade.push({
      trade: input.trade,
      takeoff: applyLocationFactor(computeTakeoff(input, prices), loc.factor),
    });
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
        project_meta: {
          ...meta.project_meta,
          location_factor: loc.factor,
          location_label: loc.label || undefined,
        },
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
      status: input.status ?? "ready",
      area_sqft: takeoff.area_sqft,
      quality_tier: input.quality_tier ?? "standard",
      conditions: input.conditions ?? {},
      location: input.location ?? null,
      ...parseUsAddress(input.location),
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
      project_id: input.project_id ?? null,
      estimate_type: input.estimate_type ?? null,
      materials_included: input.materials_included ?? null,
      advisor_answers: input.advisor_answers ?? null,
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

  revalidatePath("/home");
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

/**
 * Toggle whether this estimate's price INCLUDES material or is labor-only
 * (client supplies material). Stored on the estimate; the material line items
 * stay so the GC keeps their shopping list either way. The client-facing
 * labor-only figure is derived from the items at display time — we don't mutate
 * the stored total here because recalc() rebuilds it from all items on any edit.
 */
export async function setEstimateMaterialsIncluded(estimateId: string, included: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase
    .from("estimates")
    .update({ materials_included: included })
    .eq("id", estimateId)
    .eq("user_id", user.id);
  revalidatePath(`/estimate/${estimateId}`);
}

export interface MaterialProgress {
  received: number;
  installed: number;
}

/**
 * Field material tracking — per job, per material line: how many units have
 * ARRIVED on site and how many are INSTALLED. Stored in the estimate's
 * project_meta jsonb under `material_tracking` (no schema migration), keyed by
 * `${description}__${unit}` to match the aggregated shopping list. Units are the
 * purchasable ones shown in the list (sheets / gallons / studs …).
 */
export async function saveMaterialProgress(estimateId: string, key: string, patch: Partial<MaterialProgress>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: est } = await supabase
    .from("estimates")
    .select("project_meta")
    .eq("id", estimateId)
    .eq("user_id", user.id)
    .single();
  const meta = (est?.project_meta as Record<string, unknown> | null) ?? {};
  const tracking = ((meta.material_tracking as Record<string, MaterialProgress>) ?? {}) as Record<string, MaterialProgress>;
  const cur = tracking[key] ?? { received: 0, installed: 0 };
  tracking[key] = {
    received: Math.max(0, patch.received ?? cur.received),
    installed: Math.max(0, patch.installed ?? cur.installed),
  };
  meta.material_tracking = tracking;
  await supabase.from("estimates").update({ project_meta: meta }).eq("id", estimateId).eq("user_id", user.id);
  revalidatePath(`/estimate/${estimateId}`);
  return { ok: true };
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

/** Add a catalog line to an estimate — material + labor rows in one recalc. */
export async function addCatalogLine(
  estimateId: string,
  entry: { name: string; unit: string; material_cost: number; labor_cost: number },
  qty: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const q = qty > 0 ? qty : 1;

  const rows: {
    estimate_id: string;
    user_id: string;
    kind: ItemKind;
    description: string;
    qty: number;
    unit: string;
    unit_cost: number;
    total: number;
    sort_order: number;
  }[] = [];
  if (Number(entry.material_cost) > 0) {
    rows.push({
      estimate_id: estimateId,
      user_id: user.id,
      kind: "material",
      description: entry.name,
      qty: q,
      unit: entry.unit,
      unit_cost: Number(entry.material_cost),
      total: Math.round(q * Number(entry.material_cost) * 100) / 100,
      sort_order: 999,
    });
  }
  if (Number(entry.labor_cost) > 0) {
    rows.push({
      estimate_id: estimateId,
      user_id: user.id,
      kind: "labor",
      description: entry.name,
      qty: q,
      unit: entry.unit,
      unit_cost: Number(entry.labor_cost),
      total: Math.round(q * Number(entry.labor_cost) * 100) / 100,
      sort_order: 999,
    });
  }
  if (rows.length === 0) return;
  await supabase.from("estimate_items").insert(rows);
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
  const { data } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", estimateId)
    .select("client_id")
    .single();

  // A won job promotes the lead to a customer automatically.
  if ((status === "approved" || status === "job") && data?.client_id) {
    await supabase.from("clients").update({ status: "approved" }).eq("id", data.client_id);
    revalidatePath("/clients");
  }

  revalidatePath(`/estimate/${estimateId}`);
  revalidatePath("/estimates");
  revalidatePath("/home");
}

export async function updatePaymentSchedulePreset(estimateId: string, preset: string) {
  const supabase = await createClient();
  await supabase.from("estimates").update({ payment_schedule_preset: preset }).eq("id", estimateId);
  revalidatePath(`/estimate/${estimateId}`);
}

export async function deleteEstimate(estimateId: string) {
  const supabase = await createClient();
  await supabase.from("estimates").delete().eq("id", estimateId);
  revalidatePath("/estimates");
  revalidatePath("/home");
}
