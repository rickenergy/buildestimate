"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ShareRow {
  id: string;
  estimate_id: string;
  subcontractor_id: string | null;
  token: string;
  status: string; // pending | interested | declined
  custom_message: string | null;
  queue_order: number;
  responded_at: string | null;
  sub_name?: string | null;
}

/** Create one share per selected subcontractor, in queue order. */
export async function shareWithSubs(
  estimateId: string,
  subIds: string[],
  message: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (subIds.length === 0) return;

  // continue the queue after any existing shares for this estimate
  const { data: existing } = await supabase
    .from("estimate_shares")
    .select("queue_order")
    .eq("estimate_id", estimateId)
    .order("queue_order", { ascending: false })
    .limit(1);
  let order = (existing?.[0]?.queue_order ?? -1) + 1;

  const rows = subIds.map((sid) => ({
    user_id: user.id,
    estimate_id: estimateId,
    subcontractor_id: sid,
    token: randomBytes(16).toString("hex"),
    custom_message: message.trim() || null,
    queue_order: order++,
  }));

  const { error } = await supabase.from("estimate_shares").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/estimate/${estimateId}`);
}

export async function deleteShare(id: string, estimateId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("estimate_shares").delete().eq("id", id);
  revalidatePath(`/estimate/${estimateId}`);
}
