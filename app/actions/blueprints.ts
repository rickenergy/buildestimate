"use server";

import { revalidatePath } from "next/cache";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { methodFor } from "@/lib/takeoff-methods";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

export type SheetType = "architectural" | "structural" | "mep" | "civil" | "demolition" | "landscape" | "other";

export interface BlueprintTrade {
  key: string;
  label: string;
  confidence: number;
}
export interface BlueprintQuestion {
  id: string;
  q: string;
  why: string;
}
export interface SheetAnalysis {
  sheet_type: SheetType;
  sheet_label: string;
  trades: BlueprintTrade[];
  scope: string;
  questions: BlueprintQuestion[];
  scale_detected: boolean;
}
export interface BlueprintPage {
  i: number;
  path: string;
}

export interface TradeMapEntry {
  key: string;
  label: string;
  sheets: number[]; // page indexes where this trade appears
  confidence: number;
}
export interface TradeScopeWork {
  id: string;
  label: string; // the specific work item, e.g. "Paint bedrooms 1–3 walls & ceilings"
  sheet: number | null;
  measures: string[]; // what to measure for this item (from the book method)
}
export interface TradeScope {
  works: TradeScopeWork[];
  questions: BlueprintQuestion[];
  method_note: string; // the takeoff method summary applied
  selected?: string[]; // work ids the GC picked
}

export interface BlueprintRow {
  id: string;
  name: string;
  file_path: string;
  is_image: boolean;
  page_count: number;
  pages: BlueprintPage[] | null;
  status: string;
  analysis: Record<string, SheetAnalysis> | null; // keyed by page index (string)
  answers: Record<string, string> | null;
  chosen_trade: string | null;
  trade_map: TradeMapEntry[] | null;
  trade_scopes: Record<string, TradeScope> | null; // keyed by trade
  created_at: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const hasModelAccess = () =>
  !!process.env.AI_GATEWAY_API_KEY ||
  !!process.env.ANTHROPIC_API_KEY ||
  !!process.env.VERCEL ||
  !!process.env.VERCEL_OIDC_TOKEN;

const schema = z.object({
  sheet_type: z
    .enum(["architectural", "structural", "mep", "civil", "demolition", "landscape", "other"])
    .describe("The drawing discipline of THIS sheet"),
  sheet_label: z.string().describe("The sheet's own title/number if legible (e.g. 'A-101 First Floor Plan'), else a short description"),
  scale_detected: z.boolean().describe("true only if a clear printed drawing scale is legible on this sheet"),
  trades: z
    .array(
      z.object({
        key: z.string().describe("trade slug in English, e.g. flooring, drywall, painting, tile, framing, roofing, concrete, electrical, plumbing, hvac"),
        label: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .describe("Trades that have work shown on THIS sheet"),
  scope: z.string().describe("2–4 sentences: what this sheet shows and the visible scope of work"),
  questions: z
    .array(z.object({ id: z.string(), q: z.string(), why: z.string() }))
    .describe("EVERYTHING you can't determine with high confidence on this sheet becomes a question — never guess"),
});

/** Create the blueprint record after the client uploads page image(s). */
export async function createBlueprint(fields: {
  name: string;
  pages: BlueprintPage[];
  isImage: boolean; // true = single image upload, false = came from a PDF
  projectId?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (fields.pages.length === 0) return { ok: false, error: "No pages" };
  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      user_id: user.id,
      name: fields.name.trim() || "Plan",
      file_path: fields.pages[0].path,
      is_image: fields.isImage,
      page_count: fields.pages.length,
      pages: fields.pages,
      project_id: fields.projectId || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/blueprints");
  return { ok: true, id: data.id as string };
}

/**
 * AI reads ONE sheet: classifies its discipline (architectural/structural/
 * MEP/civil…), lists the trades with honest confidence, describes the scope,
 * and — for anything it can't be sure of — asks a question instead of guessing.
 */
export async function analyzeBlueprintPage(
  id: string,
  pageIndex: number
): Promise<{ ok: boolean; needsKey?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!hasModelAccess()) return { ok: false, needsKey: true };

  const { data: bp } = await supabase
    .from("blueprints")
    .select("pages, analysis")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!bp) return { ok: false, error: "Not found" };
  const pages = (bp.pages as BlueprintPage[] | null) ?? [];
  const page = pages.find((p) => p.i === pageIndex);
  if (!page) return { ok: false, error: "Page not found" };

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  const lang = (profile?.language as string) ?? "en";

  const { data: signed } = await supabase.storage.from("photos").createSignedUrl(page.path, 60 * 10);
  if (!signed?.signedUrl) return { ok: false, error: "file" };

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an assisted construction takeoff engine reading ONE sheet of a plan set. This is ASSISTED — never invent a number you aren't sure of.

Do:
- Classify the sheet's discipline (architectural, structural, mep, civil, demolition, landscape, other).
- Read its own title/number if legible.
- List the trades with visible work on THIS sheet, each with an honest confidence (0–1).
- Describe the visible scope in 2–4 sentences.
- CRITICAL: for anything you can't determine with high confidence — scale, room use, ceiling heights, wall types, finishes, ambiguous symbols, missing dimensions — DO NOT GUESS. Turn it into a clear question for the contractor.
- Always question the scale unless a clear printed scale is legible.

Write scope and questions in ${LANG_NAMES[lang] ?? "English"}. Keep trade keys as English slugs.`,
            },
            { type: "image", image: signed.signedUrl },
          ],
        },
      ],
    });

    const sheet: SheetAnalysis = {
      sheet_type: output?.sheet_type ?? "other",
      sheet_label: output?.sheet_label ?? `Sheet ${pageIndex}`,
      trades: (output?.trades ?? []).sort((a, b) => b.confidence - a.confidence),
      scope: output?.scope ?? "",
      questions: output?.questions ?? [],
      scale_detected: output?.scale_detected ?? false,
    };

    const analysis = { ...((bp.analysis as Record<string, SheetAnalysis>) ?? {}), [String(pageIndex)]: sheet };
    await supabase.from("blueprints").update({ analysis, status: "analyzed" }).eq("id", id).eq("user_id", user.id);
    revalidatePath(`/blueprints/${id}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}

/* ---------- Phase 2: whole-set trade map + trade-first scope ---------- */

const tradeMapSchema = z.object({
  index_found: z.boolean().describe("true if a sheet index/drawing list was legible"),
  trades: z
    .array(
      z.object({
        key: z.string().describe("trade slug in English: painting, flooring, drywall, tile, roofing, framing, concrete, electrical, plumbing, hvac, sitework"),
        label: z.string(),
        sheets: z.array(z.number()).describe("page numbers where this trade's work appears (best guess from the index/sheets)"),
        confidence: z.number().min(0).max(1),
      })
    )
    .describe("Every trade present across the WHOLE plan set"),
});

/** Read the sheet index (first sheets) to map every trade in the whole set. */
export async function mapPlanTrades(id: string): Promise<{ ok: boolean; needsKey?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!hasModelAccess()) return { ok: false, needsKey: true };
  const { data: bp } = await supabase.from("blueprints").select("pages").eq("id", id).eq("user_id", user.id).single();
  const pages = (bp?.pages as BlueprintPage[] | null) ?? [];
  if (pages.length === 0) return { ok: false, error: "No pages" };

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  const lang = (profile?.language as string) ?? "en";

  // Index/cover is usually the first few sheets; sample first 3 + a couple more.
  const sample = pages.slice(0, 3).concat(pages.slice(3).filter((_, i) => i % 4 === 0).slice(0, 3));
  const images = (
    await Promise.all(
      sample.map(async (p) => {
        const { data } = await supabase.storage.from("photos").createSignedUrl(p.path, 60 * 10);
        return data?.signedUrl ? { type: "image" as const, image: data.signedUrl } : null;
      })
    )
  ).filter(Boolean) as { type: "image"; image: string }[];

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: tradeMapSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are reading a construction plan set to understand it BEFORE any takeoff. First find the sheet index / drawing list (usually on the first sheet) to learn which sheets exist and what disciplines they cover. Then list EVERY trade with work in this set and the sheet numbers where each appears. This is a ${pages.length}-sheet set; I'm showing you the index + a sample. Base sheet numbers on what you can read. Write labels in ${LANG_NAMES[lang] ?? "English"}, keep trade keys as English slugs.`,
            },
            ...images,
          ],
        },
      ],
    });
    const trade_map: TradeMapEntry[] = (output?.trades ?? []).sort((a, b) => b.confidence - a.confidence);
    await supabase.from("blueprints").update({ trade_map }).eq("id", id).eq("user_id", user.id);
    revalidatePath(`/blueprints/${id}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}

const tradeScopeSchema = z.object({
  works: z
    .array(
      z.object({
        id: z.string().describe("short stable id"),
        label: z.string().describe("the specific work item for this trade, e.g. 'Paint all bedroom walls & ceilings, level 4 finish'"),
        sheet: z.number().nullable().describe("page number this item is on, if known"),
        measures: z.array(z.string()).describe("what to measure for this item, per the takeoff method"),
      })
    )
    .describe("Every distinct work item for the chosen trade found across the set"),
  questions: z
    .array(z.object({ id: z.string(), q: z.string(), why: z.string() }))
    .describe("Anything you can't be sure of to quantify accurately — ask, never guess"),
});

/** Build the scope-of-work for ONE trade across the set, grounded in the book method. */
export async function buildTradeScope(id: string, trade: string): Promise<{ ok: boolean; needsKey?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!hasModelAccess()) return { ok: false, needsKey: true };
  const { data: bp } = await supabase
    .from("blueprints")
    .select("pages, trade_map, trade_scopes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!bp) return { ok: false, error: "Not found" };
  const pages = (bp.pages as BlueprintPage[] | null) ?? [];
  const map = (bp.trade_map as TradeMapEntry[] | null) ?? [];

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  const lang = (profile?.language as string) ?? "en";

  // Prefer the sheets the trade map flagged for this trade; else first sheets.
  const wanted = new Set(map.find((m) => m.key === trade)?.sheets ?? []);
  const relevant = (wanted.size ? pages.filter((p) => wanted.has(p.i)) : pages).slice(0, 6);
  const images = (
    await Promise.all(
      relevant.map(async (p) => {
        const { data } = await supabase.storage.from("photos").createSignedUrl(p.path, 60 * 10);
        return data?.signedUrl ? { type: "image" as const, image: data.signedUrl } : null;
      })
    )
  ).filter(Boolean) as { type: "image"; image: string }[];

  const method = methodFor(trade);
  const methodText = method
    ? `Follow this standard takeoff method (from US estimating/plan-reading practice):
Division: ${method.division}
Measure: ${method.measures.map((m) => `${m.what.en} (${m.unit}) — ${m.rule.en}`).join(" | ")}
Always resolve: ${method.questions.map((q) => q.q.en).join(" | ")}
Waste guidance: ${method.wasteHint.en}`
    : `Use standard US takeoff practice for ${trade}: measure by the correct unit, deduct large openings, note waste, and ask what you can't quantify.`;

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: tradeScopeSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The contractor chose the trade "${trade}" to take off from this plan set. Find EVERY work item for this trade across the sheets shown and build the scope of work — the list of works the contractor will select from.

${methodText}

Rules:
- Break the scope into distinct, selectable work items (e.g. per area/room/floor), each with what to measure.
- Do NOT produce final quantities yet — scale calibration comes next. List WHAT to measure per item.
- For anything you can't quantify accurately (scale, finishes, coats, prep, ambiguous areas) — add a question, never guess.
- Write labels/questions in ${LANG_NAMES[lang] ?? "English"}.`,
            },
            ...images,
          ],
        },
      ],
    });

    const scope: TradeScope = {
      works: output?.works ?? [],
      questions: output?.questions ?? [],
      method_note: method ? method.division : "",
    };
    const trade_scopes = { ...((bp.trade_scopes as Record<string, TradeScope>) ?? {}), [trade]: scope };
    await supabase
      .from("blueprints")
      .update({ trade_scopes, chosen_trade: trade, status: "takeoff" })
      .eq("id", id)
      .eq("user_id", user.id);
    revalidatePath(`/blueprints/${id}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}

/** Save which work items the GC selected for the chosen trade. */
export async function selectTradeWorks(id: string, trade: string, workIds: string[]) {
  const { supabase, user } = await requireUser();
  const { data: bp } = await supabase.from("blueprints").select("trade_scopes").eq("id", id).eq("user_id", user.id).single();
  const scopes = (bp?.trade_scopes as Record<string, TradeScope>) ?? {};
  if (scopes[trade]) scopes[trade].selected = workIds;
  await supabase.from("blueprints").update({ trade_scopes: scopes }).eq("id", id).eq("user_id", user.id);
  revalidatePath(`/blueprints/${id}`);
}

export async function saveBlueprintAnswers(id: string, answers: Record<string, string>) {
  const { supabase, user } = await requireUser();
  const { data: bp } = await supabase.from("blueprints").select("answers").eq("id", id).eq("user_id", user.id).single();
  const merged = { ...((bp?.answers as Record<string, unknown>) ?? {}), ...answers };
  await supabase.from("blueprints").update({ answers: merged }).eq("id", id).eq("user_id", user.id);
  revalidatePath(`/blueprints/${id}`);
}

export async function setBlueprintTrade(id: string, trade: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("blueprints")
    .update({ chosen_trade: trade, status: "takeoff" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/blueprints/${id}`);
}

export async function deleteBlueprint(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("blueprints").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/blueprints");
}

/** Signed URLs (1h) for the plan pages, keyed by page index. */
export async function getBlueprintPageUrls(id: string): Promise<Record<number, string>> {
  const { supabase, user } = await requireUser();
  const { data: bp } = await supabase.from("blueprints").select("pages").eq("id", id).eq("user_id", user.id).single();
  const pages = (bp?.pages as BlueprintPage[] | null) ?? [];
  const out: Record<number, string> = {};
  await Promise.all(
    pages.map(async (p) => {
      const { data } = await supabase.storage.from("photos").createSignedUrl(p.path, 60 * 60);
      if (data?.signedUrl) out[p.i] = data.signedUrl;
    })
  );
  return out;
}
