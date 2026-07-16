import { createClient } from "@/lib/supabase/server";
import { FinanceManager } from "@/components/finance-manager";
import { FinanceDashboard } from "@/components/finance-dashboard";
import type { JobTransaction } from "@/lib/finance";
import type { ProjectLike, TaskLike } from "@/lib/alerts";

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: transactions }, { data: estimates }, { data: projects }, { data: tasks }] =
    await Promise.all([
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
      supabase
        .from("estimates")
        .select(
          "id, title, status, est_days, start_date, end_date, created_at, total, material_cost, labor_cost, demo_cost, margin_score"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("job_tasks")
        .select("id, estimate_id, title, status, due_date")
        .eq("user_id", user!.id),
    ]);

  const txRows = (transactions ?? []) as JobTransaction[];
  // Sign private storage paths (photo / nota fiscal) inline — no server-action
  // boundary crossed during render.
  const mediaPaths = [
    ...new Set(
      txRows.flatMap((tx) =>
        [tx.photo_path, tx.invoice_path].filter((p): p is string => Boolean(p))
      )
    ),
  ];
  const mediaUrls: Record<string, string> = {};
  if (mediaPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrls(mediaPaths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) mediaUrls[s.path] = s.signedUrl;
    }
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <FinanceDashboard
        projects={(projects ?? []).map((p) => ({
          ...p,
          total: Number(p.total),
          material_cost: Number(p.material_cost),
          labor_cost: Number(p.labor_cost),
          demo_cost: Number(p.demo_cost),
        })) as ProjectLike[]}
        tasks={(tasks ?? []) as TaskLike[]}
        transactions={(transactions ?? []) as JobTransaction[]}
      />
      <FinanceManager
        transactions={txRows}
        estimates={(estimates ?? []) as { id: string; title: string }[]}
        mediaUrls={mediaUrls}
      />
    </main>
  );
}
