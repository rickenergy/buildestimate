"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { CashLineChart } from "@/components/charts";
import { TrafficLight } from "@/components/traffic-light";
import {
  buildAlerts,
  cashSeries,
  forecastEnd,
  projectLight,
  projectProgress,
  projectStart,
  type ProjectLike,
  type TaskLike,
} from "@/lib/alerts";
import type { JobTransaction } from "@/app/actions/finance";
import { BellRing, CalendarRange, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  projects: ProjectLike[];
  tasks: TaskLike[];
  transactions: Pick<JobTransaction, "kind" | "amount" | "occurred_at" | "estimate_id">[];
}

const LIGHT_BAR: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

export function FinanceDashboard({ projects, tasks, transactions }: Props) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();

  // realtime: refresh on any task/transaction change
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("finance-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_tasks" }, () =>
        router.refresh()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "job_transactions" }, () =>
        router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const today = useMemo(() => new Date(), []);

  const spentByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.kind === "expense" && tx.estimate_id) {
        map[tx.estimate_id] = (map[tx.estimate_id] ?? 0) + Number(tx.amount);
      }
    }
    return map;
  }, [transactions]);

  const alerts = useMemo(
    () => buildAlerts(projects, tasks, spentByProject, today),
    [projects, tasks, spentByProject, today]
  );

  const series = useMemo(
    () =>
      cashSeries(
        transactions.map((tx) => ({ ...tx, amount: Number(tx.amount) })),
        60,
        today
      ),
    [transactions, today]
  );

  const active = projects.filter((p) => p.status !== "lost" && p.status !== "draft");

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", {
      day: "2-digit",
      month: "short",
    });

  const money = (n: number) => formatMoney(n, lang);

  return (
    <div className="space-y-4">
      {/* Alarms & incidents */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <BellRing className="h-4 w-4 text-primary" /> {t.alerts.title}
            {alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-100">
                {alerts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrafficLight light="green" /> {t.alerts.allClear}
            </p>
          ) : (
            alerts.slice(0, 8).map((a, i) => (
              <Link
                key={i}
                href={`/estimate/${a.projectId}`}
                className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-accent"
              >
                <TrafficLight light={a.light} compact />
                <span className="min-w-0 flex-1 text-xs">
                  <span className="font-medium">{t.alerts.kinds[a.key]}</span>
                  {a.detail ? ` — ${a.detail}` : ""}
                  <span className="block truncate text-muted-foreground">{a.projectTitle}</span>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Cash evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> {t.alerts.cashEvolution}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CashLineChart
            data={series}
            labels={{ income: t.finance.income, expense: t.finance.expenses }}
            formatValue={money}
          />
        </CardContent>
      </Card>

      {/* Project timelines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <CalendarRange className="h-4 w-4 text-primary" /> {t.alerts.timeline}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.alerts.noProjects}</p>
          ) : (
            active.map((p) => {
              const light = projectLight(p, tasks, spentByProject[p.id] ?? 0, today);
              const progress = projectProgress(p, tasks, today);
              const own = tasks.filter((task) => task.estimate_id === p.id);
              const done = own.filter((task) => task.status === "done").length;
              return (
                <Link key={p.id} href={`/estimate/${p.id}`} className="block">
                  <div className="rounded-xl border px-3 py-2 transition-colors hover:bg-accent">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                      <TrafficLight light={light} />
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted">
                      <div
                        className={cn("h-2 rounded-full transition-all", LIGHT_BAR[light])}
                        style={{ width: `${Math.max(3, progress)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        {t.alerts.start}: {fmtDate(projectStart(p))}
                      </span>
                      <span>
                        {own.length > 0
                          ? `${done}/${own.length} ${t.alerts.tasksDone} · `
                          : ""}
                        {progress}%
                      </span>
                      <span>
                        {t.alerts.forecastEnd}: {fmtDate(forecastEnd(p))}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
