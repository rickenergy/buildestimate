"use server";

import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

export interface ImproveResult {
  ok: boolean;
  needsKey?: boolean;
  text?: string;
  error?: string;
}

/**
 * Rewrite a rough job description into a professional, conversion-oriented
 * one — still factual, no invented scope. Used on the AI estimate form.
 */
export async function improveDescription(
  trade: string,
  rough: string
): Promise<ImproveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!rough.trim()) return { ok: false, error: "empty" };

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
    .select("language, company_name")
    .eq("id", user.id)
    .single();
  const lang = profile?.language ?? "en";

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-5",
      prompt: `You are a copywriter for a ${trade} contractor${profile?.company_name ? ` (${profile.company_name})` : ""}.

Rewrite this rough job description into a clear, professional scope description that reads well on a client-facing proposal and helps win the job. Keep every fact from the original — do NOT invent measurements, materials or scope that isn't implied. Fix grammar, be specific and confident, 2-4 sentences. No prices. No bullet lists. Write in ${LANG_NAMES[lang] ?? "English"}.

Rough description:
"""${rough.trim()}"""

Return ONLY the improved description text, nothing else.`,
    });

    return { ok: true, text: text.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    if (/api key|unauthorized|401|credential/i.test(msg)) return { ok: false, needsKey: true };
    return { ok: false, error: msg };
  }
}
