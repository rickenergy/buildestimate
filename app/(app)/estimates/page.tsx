import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { ListRow } from "@/components/ui/primitives";
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

  const rows = estimates ?? [];

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <h1 className="text-2xl font-bold">{t.nav.estimates}</h1>
        {rows.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {rows.length}
          </span>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t.dashboard.noEstimates}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((e, i) => (
            <Link key={e.id} href={`/estimate/${e.id}`}>
              <ListRow className="animate-fade-up" style={{ ["--i" as string]: Math.min(i, 8) }}>
                <div className="min-w-0 flex-1">
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
              </ListRow>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
