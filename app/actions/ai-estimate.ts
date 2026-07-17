"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadPrices } from "@/lib/prices-server";
import { learnCatalogItems } from "@/lib/catalog-learn";
import { locationIndex } from "@/lib/takeoff/location";
import { computeTotals } from "@/lib/takeoff";
import { saveEstimate } from "./estimates";
import type { ComputedItem, TakeoffResult } from "@/lib/takeoff/types";
import type { ItemKind } from "@/lib/types";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

const lineItemSchema = z.object({
  name: z.string().describe("Short line item name"),
  description: z.string().describe("What this covers"),
  category: z.enum(["labor", "material", "equipment", "other"]),
  quantity: z.number(),
  unit: z.string().describe("sqft, lf, hr, ea, day…"),
  unit_cost: z.number().describe("COST per unit in USD — no markup"),
  total_cost: z.number().describe("quantity × unit_cost"),
});

const draftSchema = z.object({
  scope: z.string().describe("Detected scope of work, 2-4 sentences"),
  assumptions: z.array(z.string()).min(1).describe("Assumptions made from photos/description"),
  line_items: z.array(lineItemSchema).min(2),
  labor_cost: z.number(),
  material_cost: z.number(),
  equipment_cost: z.number(),
  overhead: z.number().describe("Job-site overhead cost allowance"),
  total_cost: z.number().describe("Sum of all costs — no profit"),
  minimum_price: z.number().describe("Lowest defensible price protecting the minimum margin"),
  recommended_price: z.number(),
  premium_price: z.number().describe("High-touch/urgent price"),
  risk_level: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string()).describe("Anything the contractor must verify on site"),
});

export type AiDraft = z.infer<typeof draftSchema> & {
  trade: string;
  location?: string;
  location_label?: string;
  location_factor?: number;
};

export interface AiDraftResult {
  ok: boolean;
  needsKey?: boolean;
  draft?: AiDraft;
  error?: string;
}

/**
 * AI Estimate Engine: photos + description → structured draft.
 * The draft is NEVER final — the UI always shows
 * "AI-generated draft. Final price must be reviewed and approved by the contractor."
 */
export async function aiDraftEstimate(input: {
  trade: string;
  location?: string;
  description: string;
  measurements?: string;
  photos: string[]; // data URLs, resized client-side
}): Promise<AiDraftResult> {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("language, min_margin_pct, overhead_pct, profit_pct, hourly_rate")
    .eq("id", user.id)
    .single();

  const prices = await loadPrices(supabase, input.trade);
  const loc = locationIndex(input.location);
  const lang = profile?.language ?? "en";

  const priceBook = prices
    .slice(0, 25)
    .map((p) => `- ${p.name}: material $${p.material_cost}/${p.unit}, labor $${p.labor_cost}/${p.unit}`)
    .join("\n");

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: draftSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are the estimating engine of ContractorOS AI. Build a DRAFT estimate for a US contractor. This draft is never final — the contractor reviews everything.

Job:
- Service type: ${input.trade}
- Location: ${input.location || "unknown"}${loc.label ? ` (${loc.label}, cost index ×${loc.factor})` : ""}
- Description: ${input.description}
- Known measurements: ${input.measurements || "none given — infer from photos and description, state it in assumptions"}
- Photos attached: ${input.photos.length}

Contractor's price book (COSTS per unit — prefer these over generic numbers):
${priceBook || "- empty — use typical US costs for this trade"}

Contractor settings: overhead ${profile?.overhead_pct ?? 10}%, target profit ${profile?.profit_pct ?? 20}%, minimum healthy margin ${profile?.min_margin_pct ?? 15}%.

Rules:
- Read the photos carefully: surfaces, condition, access, size cues (door ≈ 3 ft, ceiling ≈ 8 ft). Photo-based measurements are approximate — say so in assumptions.
- line_items carry COSTS only (no profit). total_cost = labor + material + equipment + overhead.
- minimum_price must protect the minimum margin; recommended_price targets the profit goal${loc.factor !== 1 ? `; apply the regional cost index ×${loc.factor}` : ""}.
- warnings: everything to verify on site before signing.
- Write all free text in ${LANG_NAMES[lang] ?? "English"}. All money in USD.`,
            },
            ...input.photos.slice(0, 4).map((url) => ({ type: "image" as const, image: url })),
          ],
        },
      ],
    });

    return {
      ok: true,
      draft: {
        ...output,
        trade: input.trade,
        location: input.location,
        location_label: loc.label || undefined,
        location_factor: loc.factor,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}

const CATEGORY_KIND: Record<string, ItemKind> = {
  labor: "labor",
  material: "material",
  equipment: "other",
  other: "other",
};

/** Contractor accepted the AI draft — price it through the standard pipeline and save. */
export async function acceptAiDraft(draft: AiDraft, clientName?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Auto-learn: any AI line item not already in the catalog is saved for reuse.
  await learnCatalogItems(supabase, user.id, draft.trade, draft.line_items);

  const { data: profile } = await supabase
    .from("profiles")
    .select("overhead_pct, profit_pct, tax_pct, min_margin_pct")
    .eq("id", user.id)
    .single();

  const items: ComputedItem[] = draft.line_items.map((li) => ({
    kind: CATEGORY_KIND[li.category] ?? "other",
    description: li.description ? `${li.name} — ${li.description}` : li.name,
    qty: li.quantity,
    unit: li.unit,
    unit_cost: li.unit_cost,
    total: Math.round(li.quantity * li.unit_cost * 100) / 100,
    is_estimated_price: true, // AI draft — contractor must confirm
  }));
  if (draft.overhead > 0) {
    items.push({
      kind: "other",
      description: "Job-site overhead (AI draft)",
      qty: 1,
      unit: "lot",
      unit_cost: draft.overhead,
      total: draft.overhead,
      is_estimated_price: true,
    });
  }

  const totals = computeTotals(
    items,
    Number(profile?.overhead_pct ?? 10),
    Number(profile?.profit_pct ?? 20),
    Number(profile?.tax_pct ?? 0),
    Number(profile?.min_margin_pct ?? 15)
  );

  const sum = (kinds: string[]) =>
    Math.round(items.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + i.total, 0) * 100) /
    100;

  const takeoff: TakeoffResult = {
    items,
    area_sqft: 0,
    waste_pct: 0,
    crew_size: 2,
    est_days: Math.max(0.5, Math.round((sum(["labor"]) / 1100) * 2) / 2),
    material_cost: sum(["material"]),
    labor_cost: sum(["labor", "other"]),
    demo_cost: sum(["demo", "disposal"]),
  };

  return saveEstimate({
    input: {
      trade: draft.trade,
      title: `${draft.trade} — AI draft`,
      conditions: {},
      location: draft.location,
      client_name: clientName,
      status: "ai_generated",
      project_meta: {
        ai: {
          scope: draft.scope,
          assumptions: draft.assumptions,
          warnings: draft.warnings,
          risk_level: draft.risk_level,
          minimum_price: draft.minimum_price,
          recommended_price: draft.recommended_price,
          premium_price: draft.premium_price,
          disclaimer:
            "AI-generated draft. Final price must be reviewed and approved by the contractor.",
        },
        location_factor: draft.location_factor,
        location_label: draft.location_label,
      },
    },
    takeoff,
    totals,
  });
}
