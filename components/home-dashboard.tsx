"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstimateStatusBadge } from "@/components/status-badge";
import { CashLineChart, MonthlyBars, StageBars } from "@/components/charts";
import { TrafficLight } from "@/components/traffic-light";
import { InfoHint } from "@/components/info-hint";
import { StatTile, SectionLabel, ListRow } from "@/components/ui/primitives";
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
  MapPin,
  BellRing,
  TriangleAlert,
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
  const incidentsLabel =
    lang === "pt" ? "Incidentes & problemas" : lang === "es" ? "Incidentes y problemas" : "Incidents & problems";
  const money = (n: number) => formatMoney(n, lang);

  const trendNode = (trend: number | null | undefined) =>
    trend === undefined || trend === null ? undefined : (
      <span
        className={cn(
          "flex items-center gap-0.5 text-[10px] font-semibold",
          trend >= 0 ? "text-green-600" : "text-destructive"
        )}
      >
        {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(trend)}%
      </span>
    );

  return (
    <main className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold leading-tight">
            {t.dashboard.greeting}
            {data.firstName ? `, ${data.firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{t.appName}</p>
        </div>
        {data.alertsCount > 0 && (
          <Link
            href="/finance"
            className="press flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive shadow-xs"
          >
            <BellRing className="h-3.5 w-3.5" /> {data.alertsCount}
          </Link>
        )}
      </header>

      <Button
        asChild
        size="lg"
        className="press h-14 animate-fade-up rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-base shadow-lg shadow-primary/25"
        style={{ ["--i" as string]: 1 }}
      >
        <Link href="/estimate/new">
          <Plus className="mr-1 h-5 w-5" /> {t.dashboard.newEstimate}
        </Link>
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/projects"
          className="press flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm font-medium shadow-xs ring-1 ring-foreground/10 hover:shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> {t.newflow.projectsTitle}
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
        <Link
          href="/demand"
          className="press flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm font-medium shadow-xs ring-1 ring-foreground/10 hover:shadow-sm"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {t.demand.title}
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
        <Link
          href="/incidents"
          className="press col-span-2 flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm font-medium shadow-xs ring-1 ring-foreground/10 hover:shadow-sm"
        >
          <span className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" /> {incidentsLabel}
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
      </div>

      {/* hero tiles */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatTile
          style={{ ["--i" as string]: 0 }}
          accent="emerald"
          colorValue
          icon={<TrendingUp className="h-4 w-4" />}
          label={t.home.revenueMonth}
          value={money(data.revenueMonth)}
          trailing={trendNode(data.revenueTrend)}
        />
        <StatTile
          style={{ ["--i" as string]: 1 }}
          accent="violet"
          icon={<PiggyBank className="h-4 w-4" />}
          label={t.home.profitMonth}
          value={money(data.profitMonth)}
        />
        <StatTile
          style={{ ["--i" as string]: 2 }}
          accent="blue"
          colorValue
          icon={<Wallet className="h-4 w-4" />}
          label={t.home.cash}
          value={money(data.cashBalance)}
          danger={data.cashBalance < 0}
        />
        <StatTile
          style={{ ["--i" as string]: 3 }}
          accent="primary"
          icon={<Layers className="h-4 w-4" />}
          label={
            <>
              {t.home.pipeline} <InfoHint id="pipeline" className="shrink-0" />
            </>
          }
          value={money(data.pipelineValue)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile
          style={{ ["--i" as string]: 4 }}
          accent="amber"
          icon={<Trophy className="h-4 w-4" />}
          label={
            <>
              {t.home.winRate} <InfoHint id="win_rate" className="shrink-0" />
            </>
          }
          value={data.winRate === null ? "—" : `${data.winRate}%`}
        />
        <StatTile
          style={{ ["--i" as string]: 5 }}
          accent="rose"
          icon={<FileClock className="h-4 w-4" />}
          label={t.home.outstanding}
          value={money(data.outstanding)}
        />
        <StatTile
          style={{ ["--i" as string]: 6 }}
          accent="primary"
          icon={<HardHat className="h-4 w-4" />}
          label={t.home.activeJobs}
          value={String(data.activeJobs)}
          trailing={data.activeJobs > 0 ? <TrafficLight light={data.worstLight} compact /> : undefined}
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
      <section className="space-y-2">
        <SectionLabel>{t.dashboard.recentEstimates}</SectionLabel>
        {data.recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t.dashboard.noEstimates}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recent.map((e) => (
              <Link key={e.id} href={`/estimate/${e.id}`}>
                <ListRow>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{t.trades[e.trade] ?? e.trade}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold">{money(Number(e.total))}</span>
                    <EstimateStatusBadge status={e.status} />
                  </div>
                </ListRow>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
