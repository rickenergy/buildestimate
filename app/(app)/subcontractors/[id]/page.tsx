import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSubHistory, scoreSubs, type SubShareHistory, type SubIncidentRow } from "@/lib/sub-history";
import { SubProfile } from "@/components/sub-profile";
import { publicBaseUrl } from "@/lib/site-url";
import type { SubContractRow } from "@/app/actions/sub-contracts";
import type { SubPaymentRow } from "@/app/actions/sub-payments";
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

  const [{ shares, incidents }, { data: docs }, { data: contracts }, { data: payments }] = await Promise.all([
    fetchSubHistory(supabase, user!.id, id),
    supabase.from("subcontractor_docs").select("*").eq("subcontractor_id", id).eq("user_id", user!.id),
    supabase
      .from("sub_contracts")
      .select("id, title, amount, status, token, signed_name, signed_at, created_at")
      .eq("subcontractor_id", id)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sub_payments")
      .select("id, contract_id, amount, paid_at, method, note")
      .eq("subcontractor_id", id)
      .eq("user_id", user!.id)
      .order("paid_at", { ascending: false }),
  ]);

  // Compliance from the docs checklist when present, falling back to the
  // legacy license/insurance fields on the sub record.
  const docList = docs ?? [];
  const licenseDoc = docList.find((d) => d.doc_type === "license");
  const coiDoc = docList.find((d) => d.doc_type === "coi");
  const merged = {
    ...(sub as Subcontractor),
    license_number: licenseDoc ? (licenseDoc.reference ?? "doc") : (sub.license_number as string | null),
    insurance_provider: coiDoc ? (coiDoc.reference ?? "COI") : (sub.insurance_provider as string | null),
    insurance_expires: coiDoc ? (coiDoc.expires as string | null) : (sub.insurance_expires as string | null),
  } as Subcontractor;
  const score = scoreSubs([merged], shares, incidents).get(id)!;

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
      docs={docList}
      contracts={(contracts ?? []) as SubContractRow[]}
      payments={(payments ?? []) as SubPaymentRow[]}
      baseUrl={publicBaseUrl()}
    />
  );
}
