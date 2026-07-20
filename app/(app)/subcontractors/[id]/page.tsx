import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSubHistory, scoreSubs, type SubShareHistory, type SubIncidentRow } from "@/lib/sub-history";
import { SubProfile } from "@/components/sub-profile";
import type { Subcontractor } from "@/lib/types";

export default async function SubcontractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();
  if (!sub) notFound();

  const { shares, incidents } = await fetchSubHistory(supabase, user!.id, id);
  const score = scoreSubs([sub as Subcontractor], shares, incidents).get(id)!;

  const history: SubShareHistory[] = shares.map((s) => {
    const est = Array.isArray(s.estimates) ? s.estimates[0] : s.estimates;
    return {
      id: s.id as string,
      status: s.status as string,
      created_at: s.created_at as string,
      responded_at: (s.responded_at as string | null) ?? null,
      job_title: (est as { title?: string } | null)?.title ?? null,
      job_status: (est as { status?: string } | null)?.status ?? null,
    };
  });

  return (
    <SubProfile
      sub={sub as Subcontractor}
      score={score}
      shares={history}
      incidents={incidents as SubIncidentRow[]}
    />
  );
}
