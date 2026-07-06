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

/** Get the proposal for an estimate, creating a draft if none exists. */
export async function getOrCreateProposal(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("proposals")
    .select("*")
    .eq("estimate_id", estimateId)
    .maybeSingle();
  if (existing) return existing;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: created, error } = await supabase
    .from("proposals")
    .insert({
      estimate_id: estimateId,
      user_id: user.id,
      valid_until: validUntil.toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

/** AI writes scope/exclusions/terms from the estimate content. */
export async function generateProposalText(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("*, clients(name)").eq("id", estimateId).single(),
    supabase.from("estimate_items").select("kind, description, qty, unit").eq("estimate_id", estimateId).order("sort_order"),
    supabase.from("profiles").select("language, company_name, full_name").eq("id", user.id).single(),
  ]);
  if (!estimate) throw new Error("Estimate not found");

  const lang = profile?.language ?? "en";

  const { output } = await generateText({
    model: "anthropic/claude-sonnet-5",
    output: Output.object({
      schema: z.object({
        scope: z.string().describe("Professional scope of work, short paragraphs or bullet lines"),
        exclusions: z.string().describe("What is NOT included, bullet lines"),
        terms: z.string().describe("Payment terms, warranty, change-order policy — standard for small contractors"),
      }),
    }),
    prompt: `Write a professional but simple construction proposal in ${LANG_NAMES[lang] ?? "English"} for a small contractor${profile?.company_name ? ` (${profile.company_name})` : ""}.

Job: ${estimate.title} (${estimate.trade})
Client: ${(estimate.clients as { name: string } | null)?.name ?? "—"}
Location: ${estimate.location ?? "—"}
Area: ${estimate.area_sqft ?? "—"} sqft
Estimated duration: ${estimate.est_days ?? "—"} days, crew of ${estimate.crew_size ?? "—"}

Line items:
${(items ?? []).map((i) => `- [${i.kind}] ${i.description}: ${i.qty} ${i.unit}`).join("\n")}

Rules:
- Scope: describe the work clearly, grouped by phase (prep/demo → install → finish). No prices inside the text.
- Exclusions: standard for this trade (e.g. furniture moving, structural repairs, permits unless stated, unforeseen subfloor damage).
- Terms: 30-40% deposit to schedule, balance on completion, workmanship warranty 1 year, changes require written change order, proposal valid 30 days.
- Plain language a homeowner understands. No corporate filler.`,
  });

  await supabase
    .from("proposals")
    .update({ scope: output.scope, exclusions: output.exclusions, terms: output.terms })
    .eq("estimate_id", estimateId);

  revalidatePath(`/estimate/${estimateId}/proposal`);
  return output;
}

export async function updateProposal(
  proposalId: string,
  fields: { scope?: string; exclusions?: string; terms?: string; valid_until?: string }
) {
  const supabase = await createClient();
  await supabase.from("proposals").update(fields).eq("id", proposalId);
}

/** Mark as sent; move estimate + client pipeline forward. */
export async function sendProposal(proposalId: string) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .update({ status: "sent" })
    .eq("id", proposalId)
    .select("estimate_id, token")
    .single();
  if (!proposal) throw new Error("Not found");

  const { data: estimate } = await supabase
    .from("estimates")
    .update({ status: "sent" })
    .eq("id", proposal.estimate_id)
    .select("client_id")
    .single();

  if (estimate?.client_id) {
    await supabase
      .from("clients")
      .update({ status: "estimate_sent" })
      .eq("id", estimate.client_id);
  }

  revalidatePath(`/estimate/${proposal.estimate_id}/proposal`);
  return { token: proposal.token as string };
}
