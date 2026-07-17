import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EstimatePrintView, type PrintProfile } from "@/components/estimate-print-view";
import type { Estimate, EstimateItem } from "@/lib/types";

export default async function EstimatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: estimate }, { data: items }, { data: profile }] = await Promise.all([
    supabase.from("estimates").select("*, clients(name, phone, address)").eq("id", id).single(),
    supabase.from("estimate_items").select("*").eq("estimate_id", id).order("sort_order"),
    supabase
      .from("profiles")
      .select(
        "company_name, full_name, phone, logo_url, banner_url, company_address, company_email, license_number"
      )
      .eq("id", user!.id)
      .single(),
  ]);

  if (!estimate) notFound();

  return (
    <EstimatePrintView
      estimate={
        estimate as Estimate & {
          clients: { name: string; phone: string | null; address: string | null } | null;
        }
      }
      items={(items ?? []) as EstimateItem[]}
      profile={(profile ?? {}) as PrintProfile}
    />
  );
}
