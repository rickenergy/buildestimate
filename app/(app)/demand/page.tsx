import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { getDemandReport } from "@/app/actions/demand";
import { getPermitPulse } from "@/lib/permits";
import { PermitPulseCard } from "@/components/permit-pulse-card";
import { StageBars } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { MapPin, TrendingUp } from "lucide-react";

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
  const lang = (profile?.language as string) ?? "en";
  const t = getDict(lang);
  const d = t.demand;

  const [report, permitPulse] = await Promise.all([getDemandReport(), getPermitPulse()]);
  const money = (n: number) => formatMoney(n, lang);
  const tradeName = (tr: string) => t.trades[tr] ?? tr;

  const areaRows = report.areas
    .slice(0, 12)
    .map((a) => ({ label: a.label, value: a.value, count: a.count }));
  const tradeRows = report.trades
    .slice(0, 12)
    .map((tr) => ({ label: tradeName(tr.trade), value: tr.value, count: tr.count }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </header>

      <PermitPulseCard pulse={permitPulse} />

      {report.locatedCount === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{d.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{d.emptyBody}</p>
            <Link
              href="/estimate/new"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
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
                    {report.topArea.winRate !== null
                      ? ` · ${report.topArea.winRate}% ${d.winRate}`
                      : ""}
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
                  <div
                    key={a.key}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm"
                  >
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
            {d.coverage.replace("{located}", String(report.locatedCount)).replace(
              "{total}",
              String(report.totalCount)
            )}
          </p>
        </>
      )}
    </div>
  );
}
