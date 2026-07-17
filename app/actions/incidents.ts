"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createIncident(fields: {
  title: string;
  description?: string;
  severity: "green" | "yellow" | "red";
  estimate_id?: string | null;
  assignee_sub_id?: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!fields.title.trim()) throw new Error("Title required");

  const { error } = await supabase.from("incidents").insert({
    user_id: user.id,
    title: fields.title.trim(),
    description: fields.description?.trim() || null,
    severity: fields.severity,
    estimate_id: fields.estimate_id || null,
    assignee_sub_id: fields.assignee_sub_id || null,
    assignee_name: fields.assignee_name?.trim() || null,
    assignee_email: fields.assignee_email?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/incidents");
}

export async function resolveIncident(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase
    .from("incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/incidents");
}

export async function reopenIncident(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase
    .from("incidents")
    .update({ status: "open", resolved_at: null })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/incidents");
}

export async function deleteIncident(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase.from("incidents").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/incidents");
}
