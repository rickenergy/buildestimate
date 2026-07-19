import { createClient } from "@/lib/supabase/server";
import type { AccessProfile } from "@/lib/access-profiles";

export type { AccessProfile } from "@/lib/access-profiles";
export { PROFILE_LABELS, INVITABLE_PROFILES } from "@/lib/access-profiles";

export interface Membership {
  orgId: string; // the owner's user id — the "organization"
  profile: AccessProfile;
  isOwner: boolean;
}

/**
 * Resolve the logged-in user's organization + access profile.
 * Owner (no membership row) → their own id as org, profile "owner".
 * Server-only (imports the server Supabase client).
 */
export async function getMembership(): Promise<Membership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("current_org");
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.org_id) {
    return {
      orgId: row.org_id as string,
      profile: (row.access_profile as AccessProfile) ?? "owner",
      isOwner: (row.access_profile as string) === "owner",
    };
  }
  return { orgId: user.id, profile: "owner", isOwner: true };
}
