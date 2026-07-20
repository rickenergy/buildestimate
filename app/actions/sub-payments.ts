"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SubPaymentRow {
  id: string;
  contract_id: string | null;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function addSubPayment(fields: {
  subcontractorId: string;
  contractId?: string | null;
  amount: number;
  paidAt?: string | null;
  method?: string;
  note?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!(fields.amount > 0)) throw new Error("Valid amount required");
  const { error } = await supabase.from("sub_payments").insert({
    user_id: user.id,
    subcontractor_id: fields.subcontractorId,
    contract_id: fields.contractId || null,
    amount: fields.amount,
    paid_at: fields.paidAt || new Date().toISOString().slice(0, 10),
    method: fields.method?.trim() || null,
    note: fields.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/subcontractors/${fields.subcontractorId}`);
}

export async function deleteSubPayment(id: string, subcontractorId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("sub_payments").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath(`/subcontractors/${subcontractorId}`);
}
