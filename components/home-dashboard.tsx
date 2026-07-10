"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstimateStatusBadge } from "@/components/status-badge";
import { CashLineChart, MonthlyBars, StageBars } from "@/components/charts";
import { TrafficLight } from "@/components/traffic-light";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import type { Light } from "@/lib/alerts";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Layers,
  Trophy,
  FileClock,
  HardHat,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface HomeData {
  firstName: string;
  revenueMonth: number;
  revenueTrend: number | null; // % vs last month
  profitMonth: number;
  cashBalance: number;
  pipelineValue: number;
  winRate: number | null;
  outstanding: number;
  activeJobs: number;
  worstLight: Light;
  alertsCount: number;
  cashSeries: { date: string; income: number; expense: number }[];
  monthly: { label: string; value: number }[];
  funnel: { label: string; value: number; count: number }[];
  recent: { id: string; title: string; trade: string; status: string; total: number }[];
}

export function HomeDashboard({ data }: { data: HomeData }) {
  const t = useDict();
  const lang = useLang();
  const money = (n: number) => formatMoney(n, lang);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {t.dashboard.greeting}
            {data.firstName ? `, ${data.firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{t.appName}</p>
        </div>
        {data.alertsCount > 0 && (
          <Link
            href="/finance"
            className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-100"
          >
            <BellRing className="h-3.5 w-3.5" /> {data.alertsCount}
          </Link>
        )}
      </header>

      <Button asChild size="lg" className="h-14 text-base">
        <Link href="/estimate/new">
          <Plus className="mr-1 h-5 w-5" /> {t.dashboard.newEstimate}
        </Link>
      </Button>

      {/* hero tiles */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label={t.home.revenueMonth}
          value={money(data.revenueMonth)}
          trend={data.revenueTrend}
        />
        <Tile
          icon={<PiggyBank className="h-4 w-4 text-primary" />}
          label={t.home.profitMonth}
          value={money(data.profitMonth)}
        />
        <Tile
          icon={<Wallet className="h-4 w-4 text-primary" />}
          label={t.home.cash}
          value={money(data.cashBalance)}
          danger={data.cashBalance < 0}
        />
        <Tile
          icon={<Layers className="h-4 w-4 text-primary" />}
          label={t.home.pipeline}
          value={money(data.pipelineValue)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile
          icon={<Trophy className="h-4 w-4 text-primary" />}
          label={t.home.winRate}
          value={data.winRate === null ? "—" : `${data.winRate}%`}
        />
        <Tile
          icon={<FileClock className="h-4 w-4 text-amber-500" />}
          label={t.home.outstanding}
          value={money(data.outstanding)}
        />
        <Tile
          icon={<HardHat className="h-4 w-4 text-primary" />}
          label={t.home.activeJobs}
          value={String(data.activeJobs)}
          badge={data.activeJobs > 0 ? <TrafficLight light={data.worstLight} compact /> : undefined}
        />
      </div>

      {/* revenue by month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.home.revenueByMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBars data={data.monthly} formatValue={money} />
        </CardContent>
      </Card>

      {/* cash evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> {t.alerts.cashEvolution}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CashLineChart
            data={data.cashSeries}
            labels={{ income: t.finance.income, expense: t.finance.expenses }}
            formatValue={money}
          />
        </CardContent>
      </Card>

      {/* estimate pipeline funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.home.estimatePipeline}</CardTitle>
        </CardHeader>
        <CardContent>
          <StageBars rows={data.funnel} formatValue={money} />
        </CardContent>
      </Card>

      {/* recent */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          {t.dashboard.recentEstimates}
        </h2>
        {data.recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t.dashboard.noEstimates}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recent.map((e) => (
              <Link key={e.id} href={`/estimate/${e.id}`}>
                <Card className="transition-colors active:bg-accent">
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{t.trades[e.trade] ?? e.trade}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{money(Number(e.total))}</span>
                      <EstimateStatusBadge status={e.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Tile({
  icon,
  label,
  value,
  trend,
  danger,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number | null;
  danger?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          {icon}
          {badge}
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-semibold",
                trend >= 0 ? "text-green-600" : "text-red-500"
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <span className={cn("truncate text-base font-bold", danger && "text-red-500")}>
          {value}
        </span>
        <span className="truncate text-[10px] uppercase text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
