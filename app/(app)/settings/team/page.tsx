import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership";
import { publicBaseUrl } from "@/lib/site-url";
import { TeamManager, type MemberRow, type InviteRow } from "@/components/team-manager";

export default async function TeamPage() {
  const membership = await getMembership();
  // only the owner manages the team
  if (!membership?.isOwner) redirect("/home");

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id, access_profile, created_at, employees(name)")
      .eq("org_id", membership.orgId)
      .order("created_at"),
    supabase
      .from("org_invites")
      .select("id, label, access_profile, token, created_at")
      .eq("org_id", membership.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const memberRows: MemberRow[] = (members ?? []).map((m) => {
    const emp = Array.isArray(m.employees) ? m.employees[0] : m.employees;
    return {
      id: m.id as string,
      access_profile: m.access_profile,
      employee_name: (emp as { name?: string } | null)?.name ?? null,
      created_at: m.created_at as string,
    };
  });

  return (
    <TeamManager
      members={memberRows}
      invites={(invites ?? []) as InviteRow[]}
      baseUrl={publicBaseUrl()}
    />
  );
}
