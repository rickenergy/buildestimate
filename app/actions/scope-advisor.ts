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

export interface ScopeQuestion {
  q: string;
  why: string;
}

export interface ScopeQuestionsResult {
  ok: boolean;
  needsKey?: boolean;
  questions?: ScopeQuestion[];
  error?: string;
}

const schema = z.object({
  questions: z
    .array(
      z.object({
        q: z.string().describe("A specific question to ask before finalizing this estimate"),
        why: z.string().describe("One short line: why it matters / what it protects"),
      })
    )
    .min(3)
    .max(7),
});

const hasModelAccess = () =>
  !!process.env.AI_GATEWAY_API_KEY ||
  !!process.env.ANTHROPIC_API_KEY ||
  !!process.env.VERCEL ||
  !!process.env.VERCEL_OIDC_TOKEN;

/**
 * Dynamic scope advisor: AI reads the specific job (trade + description) and
 * surfaces the questions a smart estimator would ask to uncover hidden needs
 * before quoting — beyond the generic checklist.
 */
export async function generateScopeQuestions(
  trade: string,
  context: string
): Promise<ScopeQuestionsResult> {
  if (!hasModelAccess()) return { ok: false, needsKey: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();
  const lang = (profile?.language as string) ?? "en";

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema }),
      prompt: `You are a seasoned US construction estimator reviewing a job before quoting. Ask the sharp, SPECIFIC questions that uncover hidden scope, risk, and cost — the things a rushed contractor forgets and loses money on.

Trade: ${trade}
Job details: ${context || "(only the trade is known — ask what you'd need to scope it)"}

Give 3–7 questions. Each must be specific to THIS job (not generic), answerable by the contractor or client, and tied to a real cost/risk. Add a one-line "why it matters". Write everything in ${LANG_NAMES[lang] ?? "English"}.`,
    });
    const questions = (output?.questions ?? []).filter((q) => q.q.trim().length > 0);
    if (questions.length === 0) return { ok: false, error: "empty" };
    return { ok: true, questions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}

/** Merge answers into estimates.advisor_answers (jsonb). */
export async function saveScopeAnswers(estimateId: string, answers: Record<string, string>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row } = await supabase
    .from("estimates")
    .select("advisor_answers")
    .eq("id", estimateId)
    .single();
  const merged = { ...((row?.advisor_answers as Record<string, unknown>) ?? {}), ...answers };

  await supabase
    .from("estimates")
    .update({ advisor_answers: merged })
    .eq("id", estimateId)
    .eq("user_id", user.id);
  revalidatePath(`/estimate/${estimateId}`);
}
