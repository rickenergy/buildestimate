"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ChangeOrder {
  id: string;
  estimate_id: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "declined";
  created_at: string;
}

export interface Invoice {
  id: string;
  estimate_id: string;
  number: number;
  label: string;
  amount: number;
  due_date: string | null;
  status: "unpaid" | "paid" | "void";
  payment_link_url: string | null;
  paid_at: string | null;
  created_at: string;
}

function refresh(estimateId: string) {
  revalidatePath(`/estimate/${estimateId}`);
  revalidatePath("/finance");
}

// ---------- change orders ----------

export async function createChangeOrder(estimateId: string, description: string, amount: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!description.trim()) throw new Error("Empty description");

  const { error } = await supabase.from("change_orders").insert({
    user_id: user.id,
    estimate_id: estimateId,
    description: description.trim(),
    amount,
  });
  if (error) throw new Error(error.message);
  refresh(estimateId);
}

export async function setChangeOrderStatus(
  id: string,
  estimateId: string,
  status: "pending" | "approved" | "declined"
) {
  const supabase = await createClient();
  await supabase.from("change_orders").update({ status }).eq("id", id);
  refresh(estimateId);
}

export async function deleteChangeOrder(id: string, estimateId: string) {
  const supabase = await createClient();
  await supabase.from("change_orders").delete().eq("id", id);
  refresh(estimateId);
}

// ---------- invoices ----------

export async function createInvoice(
  estimateId: string,
  label: string,
  amount: number,
  dueDate?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!(amount > 0)) throw new Error("Invalid amount");

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("invoices").insert({
    user_id: user.id,
    estimate_id: estimateId,
    number: (count ?? 0) + 1,
    label: label.trim() || `Invoice ${(count ?? 0) + 1}`,
    amount,
    due_date: dueDate || null,
  });
  if (error) throw new Error(error.message);
  refresh(estimateId);
}

/** Paid invoice automatically books the income in job finance. */
export async function markInvoicePaid(id: string, estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: invoice } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("label, amount")
    .single();

  if (invoice) {
    await supabase.from("job_transactions").insert({
      user_id: user.id,
      estimate_id: estimateId,
      kind: "income",
      category: "progress",
      description: invoice.label,
      amount: invoice.amount,
    });
  }
  refresh(estimateId);
}

export async function voidInvoice(id: string, estimateId: string) {
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "void" }).eq("id", id);
  refresh(estimateId);
}

export interface PaymentLinkResult {
  ok: boolean;
  needsStripe?: boolean;
  url?: string;
  error?: string;
}

/**
 * Stripe payment link via REST (no SDK dep). Needs STRIPE_SECRET_KEY;
 * without it the UI shows setup instructions.
 */
export async function createPaymentLink(
  invoiceId: string,
  estimateId: string
): Promise<PaymentLinkResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, needsStripe: true };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("label, amount, payment_link_url")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.payment_link_url) return { ok: true, url: invoice.payment_link_url };

  const stripe = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    if (!res.ok) throw new Error((await res.json())?.error?.message ?? `Stripe ${res.status}`);
    return res.json();
  };

  try {
    const price = await stripe("prices", {
      currency: "usd",
      unit_amount: String(Math.round(Number(invoice.amount) * 100)),
      "product_data[name]": invoice.label,
    });
    const link = await stripe("payment_links", {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
    });

    await supabase.from("invoices").update({ payment_link_url: link.url }).eq("id", invoiceId);
    refresh(estimateId);
    return { ok: true, url: link.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Stripe error" };
  }
}
