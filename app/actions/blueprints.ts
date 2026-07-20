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

export interface BlueprintTrade {
  key: string;
  label: string;
  confidence: number; // 0–1
}
export interface BlueprintQuestion {
  id: string;
  q: string;
  why: string;
}
export interface BlueprintAnalysis {
  trades: BlueprintTrade[];
  scope: string;
  questions: BlueprintQuestion[];
  scale_detected: boolean;
}

export interface BlueprintRow {
  id: string;
  name: string;
  file_path: string;
  is_image: boolean;
  status: string;
  analysis: BlueprintAnalysis | null;
  answers: Record<string, string> | null;
  chosen_trade: string | null;
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
  trades: z
    .array(
      z.object({
        key: z.string().describe("trade slug, e.g. flooring, drywall, painting, tile, framing, roofing"),
        label: z.string().describe("human label for the trade"),
        confidence: z.number().min(0).max(1).describe("0–1 how sure you are this trade appears"),
      })
    )
    .describe("Trades you can see work for on this plan"),
  scope: z.string().describe("2–4 sentences: what this sheet shows and the visible scope"),
  scale_detected: z.boolean().describe("true only if a clear, reliable drawing scale is printed and legible"),
  questions: z
    .array(
      z.object({
        id: z.string().describe("short stable id, e.g. scale, room_use, ceiling_height"),
        q: z.string().describe("the question for the contractor"),
        why: z.string().describe("one line: why it matters for an accurate takeoff"),
      })
    )
    .describe("EVERYTHING you cannot determine with high confidence becomes a question here — never guess"),
});

/** Create the blueprint record after the client uploads the file. */
export async function createBlueprint(fields: {
  name: string;
  filePath: string;
  isImage: boolean;
  projectId?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      user_id: user.id,
      name: fields.name.trim() || "Plan",
      file_path: fields.filePath,
      is_image: fields.isImage,
      project_id: fields.projectId || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/blueprints");
  return { ok: true, id: data.id as string };
}

/**
 * AI reads the plan and returns detected trades, scope, and — crucially —
 * a question for ANYTHING it can't determine with high confidence (scale,
 * ambiguous areas, missing dimensions, room use). It never guesses those.
 */
export async function analyzeBlueprint(id: string): Promise<{ ok: boolean; needsKey?: boolean; needsImage?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const { data: bp } = await supabase
    .from("blueprints")
    .select("file_path, is_image")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!bp) return { ok: false, error: "Not found" };
  if (!bp.is_image) return { ok: false, needsImage: true }; // PDF rasterization = phase 2
  if (!hasModelAccess()) return { ok: false, needsKey: true };

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  const lang = (profile?.language as string) ?? "en";

  const { data: signed } = await supabase.storage.from("photos").createSignedUrl(bp.file_path, 60 * 10);
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
              text: `You are an assisted construction takeoff engine. A contractor uploaded this plan sheet. Read it and prepare the ground for a takeoff.

Rules — this is ASSISTED, not automatic:
- List the trades you can actually see work for, each with an honest confidence (0–1).
- Describe the visible scope in 2–4 sentences.
- CRITICAL: for ANYTHING you cannot determine with high confidence — the drawing scale, room use, ceiling heights, wall types, finish specs, ambiguous symbols, missing dimensions — DO NOT GUESS. Turn it into a clear question for the contractor. It is better to ask than to invent a number.
- Always ask about scale unless a clear printed scale is legible (set scale_detected accordingly).
- Write all questions and the scope in ${LANG_NAMES[lang] ?? "English"}. Keep trade keys in English slugs.`,
            },
            { type: "image", image: signed.signedUrl },
          ],
        },
      ],
    });

    const analysis: BlueprintAnalysis = {
      trades: (output?.trades ?? []).sort((a, b) => b.confidence - a.confidence),
      scope: output?.scope ?? "",
      questions: output?.questions ?? [],
      scale_detected: output?.scale_detected ?? false,
    };

    await supabase
      .from("blueprints")
      .update({ analysis, status: "analyzed" })
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

/** Signed URL to display the plan. */
export async function getBlueprintUrl(filePath: string): Promise<string | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.storage.from("photos").createSignedUrl(filePath, 60 * 60);
  return data?.signedUrl ?? null;
}
