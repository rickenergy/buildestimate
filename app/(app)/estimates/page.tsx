import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { EstimateStatusBadge } from "@/components/status-badge";
import type { Language } from "@/lib/types";

export default async function EstimatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: estimates }] = await Promise.all([
    supabase.from("profiles").select("language").eq("id", user!.id).single(),
    supabase
      .from("estimates")
      .select("id, title, trade, status, total, created_at, clients(name)")
      .order("created_at", { ascending: false }),
  ]);

  const lang = (profile?.language ?? "en") as Language;
  const t = getDict(lang);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t.nav.estimates}</h1>

      {(estimates ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t.dashboard.noEstimates}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {(estimates ?? []).map((e) => (
            <Link key={e.id} href={`/estimate/${e.id}`}>
              <Card className="transition-colors active:bg-accent">
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(e.clients as unknown as { name: string } | null)?.name ?? t.estimate.noClient}
                      {" · "}
                      {formatDate(e.created_at, lang)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold">{formatMoney(Number(e.total), lang)}</span>
                    <EstimateStatusBadge status={e.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
