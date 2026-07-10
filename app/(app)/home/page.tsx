import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { HomeDashboard, type HomeData } from "@/components/home-dashboard";
import {
  buildAlerts,
  cashSeries,
  projectLight,
  type Light,
  type ProjectLike,
  type TaskLike,
} from "@/lib/alerts";
import type { Language } from "@/lib/types";

const PIPELINE_STATUSES = ["draft", "ai_generated", "ready", "sent", "change_requested"];
const JOB_STATUSES = ["approved", "job"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: estimates }, { data: tx }, { data: invoices }, { data: tasks }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, language").eq("id", user!.id).single(),
      supabase
        .from("estimates")
        .select(
          "id, title, trade, status, total, created_at, margin_score, est_days, start_date, end_date, material_cost, labor_cost, demo_cost"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("job_transactions")
        .select("kind, amount, occurred_at, estimate_id")
        .eq("user_id", user!.id),
      supabase.from("invoices").select("amount, status").eq("user_id", user!.id),
      supabase.from("job_tasks").select("id, estimate_id, title, status, due_date").eq("user_id", user!.id),
    ]);

  const lang = (profile?.language ?? "en") as Language;
  const t = getDict(lang);
  const today = new Date();

  const all = (estimates ?? []).map((e) => ({
    ...e,
    total: Number(e.total),
    material_cost: Number(e.material_cost),
    labor_cost: Number(e.labor_cost),
    demo_cost: Number(e.demo_cost),
  }));
  const transactions = (tx ?? []).map((x) => ({ ...x, amount: Number(x.amount) }));
  const taskList = (tasks ?? []) as TaskLike[];

  // ---- month helpers ----
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisKey = monthKey(today);
  const lastKey = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));

  let revenueMonth = 0;
  let revenueLast = 0;
  let expenseMonth = 0;
  let cashBalance = 0;
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    monthlyMap.set(monthKey(new Date(today.getFullYear(), today.getMonth() - i, 1)), 0);
  }
  for (const x of transactions) {
    const k = x.occurred_at.slice(0, 7);
    if (x.kind === "income") {
      cashBalance += x.amount;
      if (k === thisKey) revenueMonth += x.amount;
      if (k === lastKey) revenueLast += x.amount;
      if (monthlyMap.has(k)) monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + x.amount);
    } else {
      cashBalance -= x.amount;
      if (k === thisKey) expenseMonth += x.amount;
    }
  }
  const revenueTrend =
    revenueLast > 0 ? Math.round(((revenueMonth - revenueLast) / revenueLast) * 100) : null;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = [...monthlyMap.entries()].map(([k, v]) => ({
    label: monthNames[Number(k.slice(5)) - 1],
    value: Math.round(v),
  }));

  // ---- estimate buckets ----
  const pipelineValue = all
    .filter((e) => PIPELINE_STATUSES.includes(e.status))
    .reduce((s, e) => s + e.total, 0);
  const approvedCount = all.filter((e) => JOB_STATUSES.includes(e.status)).length;
  const lostCount = all.filter((e) => e.status === "lost").length;
  const decided = approvedCount + lostCount;
  const winRate = decided > 0 ? Math.round((approvedCount / decided) * 100) : null;

  const outstanding = (invoices ?? [])
    .filter((i) => i.status === "unpaid")
    .reduce((s, i) => s + Number(i.amount), 0);

  const bucketSum = (statuses: string[]) => {
    const rows = all.filter((e) => statuses.includes(e.status));
    return { count: rows.length, value: rows.reduce((s, e) => s + e.total, 0) };
  };
  const drafts = bucketSum(["draft", "ai_generated"]);
  const sent = bucketSum(["ready", "sent", "change_requested"]);
  const won = bucketSum(JOB_STATUSES);
  const funnel = [
    { label: t.home.bucketDraft, ...drafts },
    { label: t.home.bucketSent, ...sent },
    { label: t.home.bucketWon, ...won },
  ];

  // ---- active jobs + traffic light ----
  const activeProjects = all.filter((e) => JOB_STATUSES.includes(e.status)) as ProjectLike[];
  const spentByProject: Record<string, number> = {};
  for (const x of transactions) {
    if (x.kind === "expense" && x.estimate_id) {
      spentByProject[x.estimate_id] = (spentByProject[x.estimate_id] ?? 0) + x.amount;
    }
  }
  const lightRank = { red: 0, yellow: 1, green: 2 };
  let worstLight: Light = "green";
  for (const p of activeProjects) {
    const l = projectLight(p, taskList, spentByProject[p.id] ?? 0, today);
    if (lightRank[l] < lightRank[worstLight]) worstLight = l;
  }

  const alerts = buildAlerts(all as ProjectLike[], taskList, spentByProject, today);

  const data: HomeData = {
    firstName: profile?.full_name?.split(" ")[0] || "",
    revenueMonth,
    revenueTrend,
    profitMonth: Math.round((revenueMonth - expenseMonth) * 100) / 100,
    cashBalance: Math.round(cashBalance * 100) / 100,
    pipelineValue,
    winRate,
    outstanding,
    activeJobs: approvedCount,
    worstLight,
    alertsCount: alerts.length,
    cashSeries: cashSeries(transactions, 60, today),
    monthly,
    funnel,
    recent: all.slice(0, 8).map((e) => ({
      id: e.id,
      title: e.title,
      trade: e.trade,
      status: e.status,
      total: e.total,
    })),
  };

  return <HomeDashboard data={data} />;
}
