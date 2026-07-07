"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ProposalCopy {
  scopeIntro: (title: string, sqft: string) => string;
  phases: { demo: string; work: string; materials: string };
  exclusions: string;
  terms: string;
}

const PROPOSAL_COPY: Record<string, ProposalCopy> = {
  en: {
    scopeIntro: (title, sqft) => `Scope of work for: ${title} (approx. ${sqft} sqft).`,
    phases: { demo: "Preparation & removal", work: "Work to be performed", materials: "Materials included" },
    exclusions: [
      "- Moving of furniture or personal belongings",
      "- Structural repairs or code corrections not listed above",
      "- Permits and inspection fees, unless stated",
      "- Repair of hidden damage found after work begins (e.g. subfloor, framing) — priced separately via change order",
    ].join("\n"),
    terms: [
      "- 40% deposit to schedule the job; balance due on completion.",
      "- Any change to the scope requires a written change order before the work is done.",
      "- Workmanship warranty: 1 year. Manufacturer warranties apply to materials.",
      "- This proposal is valid for 30 days from the date sent.",
    ].join("\n"),
  },
  pt: {
    scopeIntro: (title, sqft) => `Escopo do trabalho: ${title} (aprox. ${sqft} sqft).`,
    phases: { demo: "Preparação e remoção", work: "Serviços a executar", materials: "Materiais inclusos" },
    exclusions: [
      "- Mudança de móveis ou pertences pessoais",
      "- Reparos estruturais ou correções de código não listados acima",
      "- Licenças e taxas de inspeção, salvo indicação",
      "- Reparo de danos ocultos descobertos após o início (ex: contrapiso, estrutura) — orçado à parte via change order",
    ].join("\n"),
    terms: [
      "- Sinal de 40% para agendar; saldo na conclusão.",
      "- Qualquer mudança de escopo exige change order por escrito antes da execução.",
      "- Garantia de mão de obra: 1 ano. Materiais seguem garantia do fabricante.",
      "- Esta proposta é válida por 30 dias a partir do envio.",
    ].join("\n"),
  },
  es: {
    scopeIntro: (title, sqft) => `Alcance del trabajo: ${title} (aprox. ${sqft} sqft).`,
    phases: { demo: "Preparación y remoción", work: "Trabajos a realizar", materials: "Materiales incluidos" },
    exclusions: [
      "- Mover muebles o pertenencias personales",
      "- Reparaciones estructurales o correcciones de código no listadas arriba",
      "- Permisos y tarifas de inspección, salvo indicación",
      "- Reparación de daños ocultos descubiertos al iniciar (ej: subsuelo, estructura) — se cotiza aparte con orden de cambio",
    ].join("\n"),
    terms: [
      "- Depósito del 40% para agendar; saldo al terminar.",
      "- Todo cambio de alcance requiere orden de cambio por escrito antes de ejecutarse.",
      "- Garantía de mano de obra: 1 año. Los materiales llevan garantía del fabricante.",
      "- Esta propuesta es válida por 30 días desde su envío.",
    ].join("\n"),
  },
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

/** Builds scope/exclusions/terms from the estimate line items — deterministic, no AI. */
export async function generateProposalText(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("*, clients(name)").eq("id", estimateId).single(),
    supabase.from("estimate_items").select("kind, description, qty, unit").eq("estimate_id", estimateId).order("sort_order"),
    supabase.from("profiles").select("language").eq("id", user.id).single(),
  ]);
  if (!estimate) throw new Error("Estimate not found");

  const copy = PROPOSAL_COPY[profile?.language ?? "en"] ?? PROPOSAL_COPY.en;
  const rows = items ?? [];
  const lines = (kinds: string[]) =>
    rows
      .filter((i) => kinds.includes(i.kind))
      .map((i) => `- ${i.description} (${i.qty} ${i.unit})`)
      .join("\n");

  const demoLines = lines(["demo", "disposal"]);
  const workLines = lines(["labor", "other"]);
  const materialLines = lines(["material"]);

  const scope = [
    copy.scopeIntro(estimate.title, String(estimate.area_sqft ?? "—")),
    demoLines && `${copy.phases.demo}:\n${demoLines}`,
    workLines && `${copy.phases.work}:\n${workLines}`,
    materialLines && `${copy.phases.materials}:\n${materialLines}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const output = { scope, exclusions: copy.exclusions, terms: copy.terms };

  await supabase
    .from("proposals")
    .update(output)
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
