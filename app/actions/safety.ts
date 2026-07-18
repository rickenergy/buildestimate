"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

/** Mark a safety check done (upsert) or clear it (delete). */
export async function toggleSafetyCheck(estimateId: string, itemKey: string, done: boolean) {
  const { supabase, user } = await requireUser();
  if (done) {
    const { error } = await supabase
      .from("safety_checks")
      .upsert(
        { user_id: user.id, estimate_id: estimateId, item_key: itemKey, done: true },
        { onConflict: "estimate_id,item_key" }
      );
    if (error) throw new Error(error.message);
  } else {
    await supabase
      .from("safety_checks")
      .delete()
      .eq("estimate_id", estimateId)
      .eq("item_key", itemKey)
      .eq("user_id", user.id);
  }
  revalidatePath(`/estimate/${estimateId}`);
}
