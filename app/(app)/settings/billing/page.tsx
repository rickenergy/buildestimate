import { createClient } from "@/lib/supabase/server";
import { BillingView } from "@/components/billing-view";
import type { Profile } from "@/lib/types";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at")
    .eq("id", user!.id)
    .single();

  const { checkout } = await searchParams;
  const flash = checkout === "success" ? "success" : checkout === "canceled" ? "canceled" : null;

  return <BillingView profile={(profile ?? { plan: "trial", trial_ends_at: "" }) as Profile} flash={flash} />;
}
