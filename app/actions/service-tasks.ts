"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getTaskMapping } from "@/lib/standards";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Portuguese (Brazil)",
  es: "Spanish",
};

export type TaskSource = "mapped" | "ai";

export interface ServiceTasksResult {
  ok: boolean;
  needsKey?: boolean;
  source?: TaskSource;
  tasks?: string[];
  error?: string;
}

const hasModelAccess = () =>
  !!process.env.AI_GATEWAY_API_KEY ||
  !!process.env.ANTHROPIC_API_KEY ||
  !!process.env.VERCEL ||
  !!process.env.VERCEL_OIDC_TOKEN;

const schema = z.object({
  tasks: z.array(z.string()).min(3).max(12).describe("Ordered execution steps for the job, each a short imperative phrase"),
});

/**
 * Ordered execution tasks for an estimate's trade.
 * - Mapped trade + English → deterministic list (instant, no AI).
 * - Otherwise → AI, grounded on the mapped list when one exists, written in
 *   the contractor's language. Mapped English is used as an offline fallback.
 */
export async function getServiceTasks(trade: string, description?: string): Promise<ServiceTasksResult> {
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

  const mapped = getTaskMapping(trade);

  // fast path: mapped trade, English contractor → deterministic
  if (mapped && lang === "en") {
    return { ok: true, source: "mapped", tasks: mapped };
  }

  // no model access → return mapped English if we have it, else signal
  if (!hasModelAccess()) {
    if (mapped) return { ok: true, source: "mapped", tasks: mapped };
    return { ok: false, needsKey: true };
  }

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema }),
      messages: [
        {
          role: "user",
          content: `You map a construction service into its ordered execution steps (the tasks a crew performs, start to finish) for a US contractor.

Trade: ${trade}
${description ? `Job description: ${description}` : ""}
${mapped ? `Reference sequence (adapt, keep the order and intent):\n${mapped.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "No reference — use standard US field practice for this trade."}

Rules:
- 4 to 8 concise, ordered steps. Each a short imperative phrase (e.g. "Prep the subfloor").
- Real construction sequence, not generic advice. No prices, no fluff.
- Write every step in ${LANG_NAMES[lang] ?? "English"}.`,
        },
      ],
    });
    const tasks = output?.tasks?.filter((t) => t.trim().length > 0) ?? [];
    if (tasks.length === 0) {
      return mapped ? { ok: true, source: "mapped", tasks: mapped } : { ok: false, error: "empty" };
    }
    return { ok: true, source: "ai", tasks };
  } catch (e) {
    // fall back to mapped English if the model call fails
    if (mapped) return { ok: true, source: "mapped", tasks: mapped };
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
