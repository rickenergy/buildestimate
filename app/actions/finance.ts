"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Disposition, PurchaseType, TransactionKind } from "@/lib/finance";

export async function addTransaction(fields: {
  kind: TransactionKind;
  category: string;
  amount: number;
  description?: string;
  occurred_at?: string;
  estimate_id?: string | null;
  // cadastro fields
  purchase_type?: PurchaseType | null;
  vendor?: string | null;
  quantity?: number | null;
  unit?: string | null;
  photo_path?: string | null;
  invoice_path?: string | null;
  disposition?: Disposition | null;
  waste_value?: number | null;
  reused_estimate_id?: string | null;
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
    purchase_type: fields.purchase_type ?? null,
    vendor: fields.vendor?.trim() || null,
    quantity: fields.quantity ?? null,
    unit: fields.unit?.trim() || null,
    photo_path: fields.photo_path ?? null,
    invoice_path: fields.invoice_path ?? null,
    disposition: fields.disposition ?? null,
    waste_value: fields.waste_value ?? null,
    reused_estimate_id: fields.reused_estimate_id || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  if (fields.estimate_id) revalidatePath(`/estimate/${fields.estimate_id}`);
}

/** Sign private storage paths (photo / nota fiscal) for display. Returns a
 *  path -> signed URL map. Empty/duplicate-safe. */
export async function signFinanceMedia(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("photos").createSignedUrls(unique, 60 * 60);
  const map: Record<string, string> = {};
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
  }
  return map;
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
