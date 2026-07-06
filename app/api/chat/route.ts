import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  tool,
  isStepCount,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadPrices } from "@/lib/prices-server";
import { computeTakeoff, computeTotals } from "@/lib/takeoff";
import { TRADES } from "@/lib/types";

export const maxDuration = 60;

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

const areaSchema = z.object({
  name: z.string().optional().describe("Room/area name, e.g. 'bedroom'"),
  length_ft: z.number().optional().describe("Length in feet"),
  width_ft: z.number().optional().describe("Width in feet"),
  sqft: z.number().optional().describe("Direct square footage if known"),
});

const takeoffSchema = z.object({
  trade: z.enum(TRADES).describe("Type of work"),
  title: z.string().describe("Short job title, e.g. 'Bedroom LVP flooring'"),
  areas: z.array(areaSchema).min(1),
  wall_height_ft: z.number().optional().describe("Wall height in ft (painting/drywall), default 8"),
  doorways: z.number().optional().describe("Number of doorways (flooring transitions)"),
  doors: z.number().optional().describe("Number of doors to paint"),
  windows: z.number().optional(),
  linear_feet: z.number().optional().describe("Linear feet for fence/trim-only jobs"),
  conditions: z
    .object({
      demo: z.boolean().optional().describe("Existing surface must be removed"),
      demo_surface: z.string().optional().describe("What gets removed: carpet, vinyl, tile, drywall…"),
      prep: z.boolean().optional().describe("Prep/repair/leveling/primer needed"),
      disposal: z.boolean().optional().describe("Haul away debris"),
    })
    .optional(),
  material_name: z.string().optional().describe("Material chosen by client, e.g. 'vinyl plank'"),
  quality_tier: z.enum(["basic", "standard", "premium"]).optional(),
  location: z.string().optional().describe("City/area of the project"),
  start_timeframe: z.string().optional().describe("When the job should start"),
  client_name: z.string().optional(),
  notes: z.string().optional(),
});

export type TakeoffToolInput = z.infer<typeof takeoffSchema>;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("language, overhead_pct, profit_pct, tax_pct, min_margin_pct, company_name")
    .eq("id", user.id)
    .single();

  const lang = profile?.language ?? "en";
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-5",
    system: `You are an expert construction estimator assistant inside BuildEstimate AI, helping a small contractor${profile?.company_name ? ` (${profile.company_name})` : ""} build a professional estimate fast.

ALWAYS respond in ${LANG_NAMES[lang] ?? "English"}.

Your job: gather what's needed, then call calculate_estimate. Needed info:
1. Trade (flooring, painting, drywall, tile, roofing, remodeling, landscaping, cleaning, handyman)
2. Areas/dimensions (accept "12 by 14", "12x14", meters — convert meters to feet: 1m = 3.281ft)
3. Existing conditions (demo/removal? prep? disposal?)
4. Material + quality tier (basic/standard/premium; default standard)
5. Optional: doorways, client name, location, timeframe

Rules:
- If the user gives everything in one message, calculate immediately. Ask at most ONE short follow-up question at a time, only for truly missing essentials (trade + at least one area dimension). Use sensible defaults for the rest and say what you assumed.
- If the user sends photos, read them carefully: identify the room type, current floor/wall condition, visible damage, and estimate dimensions from visual cues (standard door = 3ft wide, standard ceiling = 8ft). State that photo-based measurements are approximate and should be confirmed.
- NEVER invent prices or totals in text. All numbers must come from the calculate_estimate tool. You may call lookup_prices first to see available materials.
- After calculate_estimate returns, give a SHORT summary (2-3 sentences): total price, crew and days, margin health. Mention any items using estimated prices. The full breakdown is already shown to the user in a card — do not repeat the item list.
- If margin_score is "low", warn the contractor clearly.
- Be brief, practical, contractor-to-contractor tone. No fluff.`,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(6),
    tools: {
      lookup_prices: tool({
        description:
          "Look up the contractor's price book (their custom prices merged over defaults) for a trade. Use to see available materials/services and their prices before calculating.",
        inputSchema: z.object({ trade: z.enum(TRADES) }),
        execute: async ({ trade }) => {
          const prices = await loadPrices(supabase, trade);
          return prices.map((p) => ({
            name: p.name,
            unit: p.unit,
            material_cost: p.material_cost,
            labor_cost: p.labor_cost,
            source: p.isUserPrice ? "user" : "default",
          }));
        },
      }),
      calculate_estimate: tool({
        description:
          "Deterministic takeoff engine: computes materials with waste factor, labor crew/days, demo/disposal, and full pricing with overhead, profit, tax and margin score. Call once you know trade + area. This shows a full estimate card to the user.",
        inputSchema: takeoffSchema,
        execute: async (input) => {
          const prices = await loadPrices(supabase, input.trade);
          const takeoff = computeTakeoff(input, prices);
          const totals = computeTotals(
            takeoff.items,
            Number(profile?.overhead_pct ?? 10),
            Number(profile?.profit_pct ?? 20),
            Number(profile?.tax_pct ?? 0),
            Number(profile?.min_margin_pct ?? 15)
          );
          return { input, takeoff, totals };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
