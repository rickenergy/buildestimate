import { createClient } from "@/lib/supabase/server";
import { SubcontractorsList } from "@/components/subcontractors-list";
import { fetchSubHistory, scoreSubs } from "@/lib/sub-history";
import type { Subcontractor } from "@/lib/types";

export default async function SubcontractorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");
  const subs = (data ?? []) as Subcontractor[];

  const { shares, incidents } = await fetchSubHistory(supabase, user!.id);
  const scoreMap = scoreSubs(subs, shares, incidents);

  // ranking: best partners first
  const ranked = [...subs].sort(
    (a, b) => (scoreMap.get(b.id)?.score ?? 0) - (scoreMap.get(a.id)?.score ?? 0)
  );
  const scores = Object.fromEntries(
    [...scoreMap.entries()].map(([id, s]) => [id, { score: s.score, tier: s.tier }])
  );

  return <SubcontractorsList rows={ranked} scores={scores} />;
}
