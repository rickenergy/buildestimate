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
  region: rangeSchema.describe("Typical pricing in the local region/metro area"),
  state: rangeSchema.describe("Typical pricing across the state"),
  top_companies: rangeSchema.describe("What large, top-branded companies charge for the same job"),
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
    supabase.from("profiles").select("language, company_name").eq("id", user.id).single(),
  ]);
  if (!estimate) throw new Error("Estimate not found");

  const lang = profile?.language ?? "en";
  const location = estimate.location || "the contractor's local market (US)";

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: insightsSchema }),
      prompt: `You are a US construction-market pricing analyst helping a small contractor position a bid.

Job being quoted:
- Trade: ${estimate.trade}
- Title: ${estimate.title}
- Area: ${estimate.area_sqft ?? "—"} sqft
- Quality tier: ${estimate.quality_tier}
- Location: ${location}
- Our quoted total: $${estimate.total}
- Duration: ${estimate.est_days ?? "—"} days, crew of ${estimate.crew_size ?? "—"}

Line items:
${(items ?? []).map((i) => `- [${i.kind}] ${i.description}: ${i.qty} ${i.unit}`).join("\n")}

Produce typical market pricing for this exact scope:
1. region: what similar local contractors charge in/around ${location}
2. state: statewide typical range
3. top_companies: what big-brand/franchise players charge (they run higher overhead)
4. competitors: exactly 3 realistic competitor profiles with typical total price and a one-line note
5. positioning: where our $${estimate.total} sits and how to win
6. price_to_beat: competitive price that still protects margin (never suggest going below ~85% of our total)

Base numbers on your knowledge of US construction pricing for this trade and region; they are planning estimates, not quotes. All prices are TOTAL job prices in USD. Write all free text in ${LANG_NAMES[lang] ?? "English"}.`,
    });

    const insights: MarketInsights = {
      ...output,
      generated_at: new Date().toISOString(),
      our_total: Number(estimate.total),
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
