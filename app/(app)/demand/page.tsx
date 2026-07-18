import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { getDemandReport } from "@/app/actions/demand";
import { getPermitPulseAll } from "@/lib/permits";
import { regionForState } from "@/lib/census-region";
import { PermitPulseCard } from "@/components/permit-pulse-card";
import { StageBars, MonthlyBars } from "@/components/charts";
import { DemandRoles } from "@/components/demand-roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { MapPin, TrendingUp } from "lucide-react";

type Lang = "en" | "pt" | "es";

// Inline trilingual labels for the GC business dashboard (glossary pattern).
const GC = {
  pipeline: { en: "Sales pipeline", pt: "Funil de vendas", es: "Embudo de ventas" },
  pipelineHint: {
    en: "Estimates by stage — count and total value.",
    pt: "Estimates por etapa — quantidade e valor total.",
    es: "Estimados por etapa — cantidad y valor total.",
  },
  revenue: { en: "Revenue (approved, 6 mo)", pt: "Receita (aprovados, 6 meses)", es: "Ingresos (aprobados, 6 meses)" },
  margin: { en: "Margin health", pt: "Saúde da margem", es: "Salud del margen" },
  marginHint: {
    en: "Estimates grouped by margin score.",
    pt: "Estimates agrupados pela pontuação de margem.",
    es: "Estimados agrupados por puntuación de margen.",
  },
  stage: {
    draft: { en: "Draft", pt: "Rascunho", es: "Borrador" },
    ready: { en: "Ready", pt: "Pronto", es: "Listo" },
    sent: { en: "Sent", pt: "Enviado", es: "Enviado" },
    approved: { en: "Approved", pt: "Aprovado", es: "Aprobado" },
    lost: { en: "Lost", pt: "Perdido", es: "Perdido" },
  },
  marginScore: {
    healthy: { en: "Healthy", pt: "Saudável", es: "Saludable" },
    medium: { en: "Medium", pt: "Média", es: "Media" },
    low: { en: "Low", pt: "Baixa", es: "Baja" },
  },
} as const;

const STAGES = ["draft", "ready", "sent", "approved", "lost"] as const;
const MARGINS = ["healthy", "medium", "low"] as const;

type EstRow = {
  state: string | null;
  status: string;
  total: number | null;
  created_at: string;
  margin_score: string | null;
};

export default async function DemandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user!.id)
    .single();
  const lang = ((profile?.language as string) ?? "en") as Lang;
  const t = getDict(lang);
  const d = t.demand;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;

  // Pull the fields for both the market pulse (state) and the GC dashboard.
  const { data: estData } = await supabase
    .from("estimates")
    .select("state,status,total,created_at,margin_score")
    .eq("user_id", user!.id);
  const est = (estData ?? []) as EstRow[];

  // dominant state → Census region for the market pulse
  const stateCounts = new Map<string, number>();
  for (const row of est) {
    const s = row.state?.trim().toUpperCase();
    if (s) stateCounts.set(s, (stateCounts.get(s) ?? 0) + 1);
  }
  const topState = [...stateCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const region = regionForState(topState);

  const [report, permitPulse] = await Promise.all([getDemandReport(), getPermitPulseAll()]);
  const money = (n: number) => formatMoney(n, lang);
  const tradeName = (trade: string) => t.trades[trade] ?? trade;

  const areaRows = report.areas.slice(0, 12).map((a) => ({ label: a.label, value: a.value, count: a.count }));
  const tradeRows = report.trades.slice(0, 12).map((x) => ({ label: tradeName(x.trade), value: x.value, count: x.count }));

  // ── GC business aggregates (from estimates) ──
  const pipelineRows = STAGES.map((s) => {
    const items = est.filter((e) => e.status === s);
    return {
      label: tr(GC.stage[s]),
      value: items.reduce((a, e) => a + Number(e.total ?? 0), 0),
      count: items.length,
    };
  });

  const marginRows = MARGINS.map((m) => {
    const items = est.filter((e) => e.margin_score === m);
    return {
      label: tr(GC.marginScore[m]),
      value: items.reduce((a, e) => a + Number(e.total ?? 0), 0),
      count: items.length,
    };
  });

  // revenue by month (approved), last 6 months
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${dt.getFullYear()}-${dt.getMonth()}`,
      label: dt.toLocaleString(lang, { month: "short" }),
      value: 0,
    };
  });
  const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]));
  for (const e of est) {
    if (e.status !== "approved") continue;
    const dt = new Date(e.created_at);
    const b = bucketByKey.get(`${dt.getFullYear()}-${dt.getMonth()}`);
    if (b) b.value += Number(e.total ?? 0);
  }
  const hasRevenue = monthBuckets.some((b) => b.value > 0);
  const hasPipeline = est.length > 0;
  const hasMargin = marginRows.some((m) => m.count > 0);

  const gcView = (
    <>
      {(hasPipeline || hasRevenue || hasMargin) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tr(GC.pipeline)}</CardTitle>
            <p className="text-sm text-muted-foreground">{tr(GC.pipelineHint)}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasPipeline && <StageBars rows={pipelineRows} formatValue={money} />}
            {hasRevenue && (
              <div>
                <p className="mb-2 text-sm font-medium">{tr(GC.revenue)}</p>
                <MonthlyBars data={monthBuckets.map((b) => ({ label: b.label, value: b.value }))} formatValue={money} />
              </div>
            )}
            {hasMargin && (
              <div>
                <p className="mb-1 text-sm font-medium">{tr(GC.margin)}</p>
                <p className="mb-2 text-xs text-muted-foreground">{tr(GC.marginHint)}</p>
                <StageBars rows={marginRows} formatValue={money} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <PermitPulseCard pulse={permitPulse} defaultGeo={region} />

      {report.locatedCount === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{d.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{d.emptyBody}</p>
            <Link href="/estimate/new" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {d.emptyCta}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {report.topArea && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <div className="text-sm">
                  <span className="text-muted-foreground">{d.topArea} </span>
                  <span className="font-semibold">{report.topArea.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {report.topArea.count} {d.jobs} · {money(report.topArea.value)}
                    {report.topArea.winRate !== null ? ` · ${report.topArea.winRate}% ${d.winRate}` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.byArea}</CardTitle>
              <p className="text-sm text-muted-foreground">{d.byAreaHint}</p>
            </CardHeader>
            <CardContent>
              <StageBars rows={areaRows} formatValue={money} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.byTrade}</CardTitle>
              <p className="text-sm text-muted-foreground">{d.byTradeHint}</p>
            </CardHeader>
            <CardContent>
              <StageBars rows={tradeRows} formatValue={money} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.winByArea}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.areas
                .filter((a) => a.winRate !== null)
                .slice(0, 10)
                .map((a) => (
                  <div key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                    <span className="truncate">{a.label}</span>
                    <span className="font-medium tabular-nums">
                      {a.winRate}% <span className="text-muted-foreground">({a.won}/{a.won + a.lost})</span>
                    </span>
                  </div>
                ))}
              {report.areas.every((a) => a.winRate === null) && (
                <p className="text-sm text-muted-foreground">{d.noDecided}</p>
              )}
            </CardContent>
          </Card>

          <p className="px-1 text-xs text-muted-foreground">
            {d.coverage.replace("{located}", String(report.locatedCount)).replace("{total}", String(report.totalCount))}
          </p>
        </>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <header className="space-y-1 animate-fade-up">
        <h1 className="text-xl font-bold">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </header>

      <DemandRoles gc={gcView} />
    </div>
  );
}
