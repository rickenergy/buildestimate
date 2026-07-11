"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionKind } from "@/lib/finance";

export async function addTransaction(fields: {
  kind: TransactionKind;
  category: string;
  amount: number;
  description?: string;
  occurred_at?: string;
  estimate_id?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!(fields.amount > 0)) throw new Error("Invalid amount");

  const { error } = await supabase.from("job_transactions").insert({
    user_id: user.id,
    estimate_id: fields.estimate_id || null,
    kind: fields.kind,
    category: fields.category,
    description: fields.description?.trim() || null,
    amount: fields.amount,
    occurred_at: fields.occurred_at || new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  if (fields.estimate_id) revalidatePath(`/estimate/${fields.estimate_id}`);
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_transactions")
    .delete()
    .eq("id", id)
    .select("estimate_id")
    .maybeSingle();
  revalidatePath("/finance");
  if (data?.estimate_id) revalidatePath(`/estimate/${data.estimate_id}`);
}
