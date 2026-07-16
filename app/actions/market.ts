"use server";

import { revalidatePath } from "next/cache";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

const rangeSchema = z.object({
  low: z.number().describe("Low end of the typical total price for this job"),
  avg: z.number().describe("Average total price for this job"),
  high: z.number().describe("High end of the typical total price"),
});

const insightsSchema = z.object({
  region: rangeSchema.describe("Typical TOTAL pricing in the local region/metro area"),
  state: rangeSchema.describe("Typical TOTAL pricing across the state"),
  top_companies: rangeSchema.describe("What large, top-branded companies charge for the same job"),
  region_unit_price: z
    .number()
    .describe("Typical price per square foot ($/sqft) in the region for this trade + quality tier"),
  competitors: z
    .array(
      z.object({
        profile: z.string().describe("Competitor profile, e.g. 'Franchise flooring chain'"),
        typical_price: z.number().describe("Typical total price this profile would quote"),
        note: z.string().describe("One-line note on how they win or lose jobs"),
      })
    )
    .min(3)
    .max(3)
    .describe("Exactly 3 competitor profiles active in this market"),
  positioning: z
    .string()
    .describe("2-3 sentences: where the contractor's price sits vs market and how to win the job"),
  price_to_beat: z
    .number()
    .describe("Suggested competitive total price that still protects margin"),
});

export type MarketInsights = z.infer<typeof insightsSchema> & {
  generated_at: string;
  our_total: number;
  // unit economics anchored on our deterministic cost engine
  our_unit_price: number | null; // $/sqft we quote
  our_cost: number; // our real material+labor+demo cost
  cost_floor: number; // cost + minimum margin — never bid below this
};

export interface MarketResult {
  ok: boolean;
  needsKey?: boolean;
  insights?: MarketInsights;
  error?: string;
}

/** Cached read — no AI call. */
export async function getMarketInsights(estimateId: string): Promise<MarketResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("estimates")
    .select("market_insights")
    .eq("id", estimateId)
    .single();
  if (data?.market_insights) return { ok: true, insights: data.market_insights as MarketInsights };
  return { ok: false };
}

/**
 * AI market analysis: typical competitor pricing for a similar job in the
 * contractor's region, state, and among top companies. Knowledge-based
 * estimates — presented in the UI with a disclaimer, cached on the estimate.
 */
export async function generateMarketInsights(estimateId: string): Promise<MarketResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (
    !process.env.AI_GATEWAY_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.VERCEL &&
    !process.env.VERCEL_OIDC_TOKEN
  ) {
    return { ok: false, needsKey: true };
  }

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", estimateId).single(),
    supabase
      .from("estimate_items")
      .select("kind, description, qty, unit")
      .eq("estimate_id", estimateId)
      .order("sort_order"),
    supabase.from("profiles").select("language, company_name, min_margin_pct").eq("id", user.id).single(),
  ]);
  if (!estimate) throw new Error("Estimate not found");

  const lang = profile?.language ?? "en";
  const location = estimate.location || "the contractor's local market (US)";

  // Anchor on our deterministic cost engine — the numbers we actually computed.
  const total = Number(estimate.total);
  const area = Number(estimate.area_sqft) || 0;
  const ourCost =
    Number(estimate.material_cost || 0) +
    Number(estimate.labor_cost || 0) +
    Number(estimate.demo_cost || 0);
  const minMargin = Number(profile?.min_margin_pct ?? 15) / 100;
  // Floor = the lowest we can bid and still keep the minimum margin over real cost.
  const costFloor = ourCost > 0 ? Math.round(ourCost / (1 - minMargin)) : Math.round(total * 0.85);
  const ourUnit = area > 0 ? total / area : null;
  const costUnit = area > 0 && ourCost > 0 ? ourCost / area : null;

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: insightsSchema }),
      prompt: `You are a US construction-market pricing analyst helping a small contractor position a bid. Anchor every number on the contractor's REAL computed cost basis below — do not invent prices disconnected from it.

Job being quoted:
- Trade: ${estimate.trade}
- Title: ${estimate.title}
- Area: ${area || "—"} sqft
- Quality tier: ${estimate.quality_tier}
- Location: ${location}
- Duration: ${estimate.est_days ?? "—"} days, crew of ${estimate.crew_size ?? "—"}

GROUND TRUTH — our deterministic estimate (built from unit costs with regional index):
- Our real cost (material + labor + demo): $${Math.round(ourCost)}
- Our quoted TOTAL: $${Math.round(total)}${ourUnit ? ` = $${ourUnit.toFixed(2)}/sqft` : ""}${costUnit ? ` (cost $${costUnit.toFixed(2)}/sqft)` : ""}
- Minimum margin to protect: ${Math.round(minMargin * 100)}% → we must never bid below $${costFloor}

Line items:
${(items ?? []).map((i) => `- [${i.kind}] ${i.description}: ${i.qty} ${i.unit}`).join("\n")}

Produce market pricing CONSISTENT with the ground truth above (treat our total as a well-built mid-market bid; competitors deviate by realistic multipliers, not random numbers):
1. region: typical TOTAL range from similar local contractors in/around ${location} (usually our total ×0.85–1.15)
2. state: statewide typical TOTAL range
3. top_companies: big-brand/franchise TOTAL range (higher overhead, usually ×1.15–1.45)
4. region_unit_price: typical $/sqft in the region for this trade + tier (must be consistent with our $/sqft above)
5. competitors: exactly 3 realistic competitor profiles with typical TOTAL price and a one-line note
6. positioning: where our $${Math.round(total)} sits vs market and how to win
7. price_to_beat: competitive TOTAL that still protects margin — NEVER below $${costFloor}

Base numbers on US construction pricing for this trade and region; planning estimates, not quotes. All range prices are TOTAL job prices in USD unless noted $/sqft. Write all free text in ${LANG_NAMES[lang] ?? "English"}.`,
    });

    // Deterministic guardrail: never let the AI push price_to_beat below our real floor.
    const priceToBeat = Math.max(costFloor, Math.round(output.price_to_beat));

    const insights: MarketInsights = {
      ...output,
      price_to_beat: priceToBeat,
      generated_at: new Date().toISOString(),
      our_total: total,
      our_unit_price: ourUnit != null ? Math.round(ourUnit * 100) / 100 : null,
      our_cost: Math.round(ourCost),
      cost_floor: costFloor,
    };

    await supabase
      .from("estimates")
      .update({ market_insights: insights, market_insights_at: insights.generated_at })
      .eq("id", estimateId);

    revalidatePath(`/estimate/${estimateId}`);
    return { ok: true, insights };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}
