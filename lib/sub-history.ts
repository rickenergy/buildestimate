import type { createClient } from "@/lib/supabase/server";
import { computeSubScore, type SubScore } from "@/lib/sub-score";
import type { Subcontractor } from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

export interface SubShareHistory {
  id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  job_title: string | null;
  job_status: string | null;
}

export interface SubIncidentRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
}

/** Raw history rows for one or all subs of a user, in two queries. */
export async function fetchSubHistory(supabase: Supa, userId: string, subId?: string) {
  let shareQ = supabase
    .from("estimate_shares")
    .select("id, subcontractor_id, status, created_at, responded_at, estimates(title, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (subId) shareQ = shareQ.eq("subcontractor_id", subId);

  let incQ = supabase
    .from("incidents")
    .select("id, assignee_sub_id, title, severity, status, created_at")
    .eq("user_id", userId)
    .not("assignee_sub_id", "is", null);
  if (subId) incQ = incQ.eq("assignee_sub_id", subId);

  const [{ data: shares }, { data: incidents }] = await Promise.all([shareQ, incQ]);
  return { shares: shares ?? [], incidents: incidents ?? [] };
}

const hours = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3_600_000;

/** Score every sub from pre-fetched history rows. */
export function scoreSubs(
  subs: Subcontractor[],
  shares: { subcontractor_id: string | null; status: string; created_at: string; responded_at: string | null }[],
  incidents: { assignee_sub_id: string | null; status: string }[]
): Map<string, SubScore> {
  const out = new Map<string, SubScore>();
  for (const sub of subs) {
    const mine = shares.filter((s) => s.subcontractor_id === sub.id);
    const responded = mine.filter((s) => s.responded_at);
    const avg =
      responded.length > 0
        ? Math.round(responded.reduce((acc, s) => acc + hours(s.created_at, s.responded_at!), 0) / responded.length)
        : null;
    const inc = incidents.filter((i) => i.assignee_sub_id === sub.id);
    out.set(
      sub.id,
      computeSubScore({
        sharesTotal: mine.length,
        interested: mine.filter((s) => s.status === "interested").length,
        declined: mine.filter((s) => s.status === "declined").length,
        avgResponseHours: avg,
        hasLicense: !!sub.license_number,
        hasInsurance: !!sub.insurance_provider,
        insuranceExpires: sub.insurance_expires,
        incidentsOpen: inc.filter((i) => i.status === "open").length,
        incidentsResolved: inc.filter((i) => i.status === "resolved").length,
      })
    );
  }
  return out;
}
