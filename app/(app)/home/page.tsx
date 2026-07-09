import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstimateStatusBadge } from "@/components/status-badge";
import { Plus, TrendingUp, CircleCheck, Clock } from "lucide-react";
import type { Estimate, Language } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: estimates }] = await Promise.all([
    supabase.from("profiles").select("full_name, language").eq("id", user!.id).single(),
    supabase
      .from("estimates")
      .select("id, title, trade, status, total, created_at, margin_score")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const lang = (profile?.language ?? "en") as Language;
  const t = getDict(lang);
  const all = (estimates ?? []) as Pick<
    Estimate,
    "id" | "title" | "trade" | "status" | "total" | "created_at" | "margin_score"
  >[];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = all.filter((e) => new Date(e.created_at) >= monthStart);
  const approvedTotal = thisMonth
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + Number(e.total), 0);
  const pendingCount = all.filter((e) => ["ready", "sent"].includes(e.status)).length;
  const approvedCount = thisMonth.filter((e) => e.status === "approved").length;

  const firstName = profile?.full_name?.split(" ")[0] || "";

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {t.dashboard.greeting}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{t.appName}</p>
        </div>
      </header>

      <Button asChild size="lg" className="h-14 text-base">
        <Link href="/estimate/new">
          <Plus className="mr-1 h-5 w-5" /> {t.dashboard.newEstimate}
        </Link>
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          label={t.dashboard.thisMonth}
          value={formatMoney(approvedTotal, lang)}
        />
        <StatCard
          icon={<CircleCheck className="h-4 w-4 text-green-600" />}
          label={t.dashboard.approved}
          value={String(approvedCount)}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          label={t.dashboard.pending}
          value={String(pendingCount)}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          {t.dashboard.recentEstimates}
        </h2>
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t.dashboard.noEstimates}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {all.slice(0, 8).map((e) => (
              <Link key={e.id} href={`/estimate/${e.id}`}>
                <Card className="transition-colors active:bg-accent">
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{e.trade}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold">{formatMoney(Number(e.total), lang)}</span>
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-3">
        {icon}
        <span className="truncate text-sm font-bold">{value}</span>
        <span className="truncate text-[10px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
