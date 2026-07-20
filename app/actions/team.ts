"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccessProfile } from "@/lib/membership";

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export interface CreateInviteResult {
  ok: boolean;
  token?: string;
  error?: string;
}

/** "Rique Construction" → "rique-construction" (ascii, max 14 chars). */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 14)
    .replace(/-$/, "");
}

/** Owner creates an invite; returns the token to build a shareable link. */
export async function createInvite(fields: {
  label?: string;
  profile: AccessProfile;
  employeeId?: string | null;
  subcontractorId?: string | null;
}): Promise<CreateInviteResult> {
  const { supabase, user } = await requireOwner();
  // Short, human link: /i/<inviter>-<10 random hex chars>
  const { data: me } = await supabase
    .from("profiles")
    .select("company_name, full_name")
    .eq("id", user.id)
    .single();
  const slug = slugify(me?.company_name || me?.full_name || "join") || "join";
  const token = `${slug}-${crypto.randomBytes(5).toString("hex")}`;
  const { error } = await supabase.from("org_invites").insert({
    org_id: user.id,
    label: fields.label?.trim() || null,
    access_profile: fields.profile,
    employee_id: fields.employeeId || null,
    subcontractor_id: fields.subcontractorId || null,
    token,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/team");
  return { ok: true, token };
}

export async function revokeInvite(id: string) {
  const { supabase, user } = await requireOwner();
  await supabase.from("org_invites").delete().eq("id", id).eq("org_id", user.id);
  revalidatePath("/settings/team");
}

export async function removeMember(id: string) {
  const { supabase, user } = await requireOwner();
  await supabase.from("org_members").delete().eq("id", id).eq("org_id", user.id);
  revalidatePath("/settings/team");
}

export async function updateMemberProfile(id: string, profile: AccessProfile) {
  const { supabase, user } = await requireOwner();
  await supabase
    .from("org_members")
    .update({ access_profile: profile })
    .eq("id", id)
    .eq("org_id", user.id);
  revalidatePath("/settings/team");
}

/** The invited person (logged in) accepts via the token. Uses the RPC. */
export async function acceptInvite(token: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "auth_required";
  const { data, error } = await supabase.rpc("accept_org_invite", { invite_token: token });
  if (error) return "error";
  return (data as string) ?? "error";
}
