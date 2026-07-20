"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildContractTerms } from "@/lib/contract-template";

export interface SubContractRow {
  id: string;
  title: string;
  amount: number;
  status: string;
  token: string;
  signed_name: string | null;
  signed_at: string | null;
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

export interface CreateContractResult {
  ok: boolean;
  token?: string;
  error?: string;
}

/** Create a signable contract for a sub; returns the public /c/ token. */
export async function createSubContract(fields: {
  subcontractorId: string;
  estimateId?: string | null;
  jobTitle: string;
  scope: string;
  amount: number;
  paymentTerms?: string;
  retainagePct?: number;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<CreateContractResult> {
  const { supabase, user } = await requireUser();
  if (!fields.jobTitle.trim()) return { ok: false, error: "Title required" };
  if (!fields.scope.trim()) return { ok: false, error: "Scope required" };
  if (!(fields.amount >= 0)) return { ok: false, error: "Valid amount required" };

  const [{ data: me }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("company_name, full_name").eq("id", user.id).single(),
    supabase
      .from("subcontractors")
      .select("name, company")
      .eq("id", fields.subcontractorId)
      .eq("user_id", user.id)
      .single(),
  ]);
  if (!sub) return { ok: false, error: "Subcontractor not found" };

  const terms = buildContractTerms({
    contractorCompany: me?.company_name || me?.full_name || "Contractor",
    subName: sub.name,
    subCompany: sub.company,
    jobTitle: fields.jobTitle.trim(),
    scope: fields.scope.trim(),
    amount: fields.amount,
    paymentTerms: fields.paymentTerms?.trim() || "",
    retainagePct: fields.retainagePct ?? 0,
    startDate: fields.startDate || null,
    endDate: fields.endDate || null,
  });

  const token = crypto.randomBytes(16).toString("hex");
  const { error } = await supabase.from("sub_contracts").insert({
    user_id: user.id,
    subcontractor_id: fields.subcontractorId,
    estimate_id: fields.estimateId || null,
    title: fields.jobTitle.trim(),
    scope: fields.scope.trim(),
    amount: fields.amount,
    payment_terms: fields.paymentTerms?.trim() || null,
    retainage_pct: fields.retainagePct ?? 0,
    start_date: fields.startDate || null,
    end_date: fields.endDate || null,
    terms,
    token,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/subcontractors/${fields.subcontractorId}`);
  return { ok: true, token };
}

export async function voidSubContract(id: string, subcontractorId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("sub_contracts").update({ status: "void" }).eq("id", id).eq("user_id", user.id);
  revalidatePath(`/subcontractors/${subcontractorId}`);
}
