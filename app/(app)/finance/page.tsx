import { createClient } from "@/lib/supabase/server";
import { FinanceManager } from "@/components/finance-manager";
import type { JobTransaction } from "@/app/actions/finance";

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: transactions }, { data: estimates }] = await Promise.all([
    supabase
      .from("job_transactions")
      .select("*, estimates(title)")
      .eq("user_id", user!.id)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("estimates")
      .select("id, title")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <FinanceManager
      transactions={(transactions ?? []) as JobTransaction[]}
      estimates={(estimates ?? []) as { id: string; title: string }[]}
    />
  );
}
