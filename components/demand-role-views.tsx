"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import {
  Ruler,
  ClipboardList,
  Building2,
  ShieldCheck,
  Hammer,
  CalendarRange,
  TriangleAlert,
  Package,
} from "lucide-react";

type Lang = "en" | "pt" | "es";
const useTr = () => {
  const lang = useLang() as Lang;
  return { lang, tr: (m: Record<Lang, string>) => m[lang] ?? m.en };
};

/* ---------- shared bits ---------- */

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "";
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

/** Two thin bars per row: estimated (muted) vs actual (colored by overrun). */
function PairRow({
  label,
  est,
  actual,
  max,
  money,
}: {
  label: string;
  est: number;
  actual: number;
  max: number;
  money: (n: number) => string;
}) {
  const over = est > 0 && actual > est;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <span className={`shrink-0 tabular-nums ${over ? "font-semibold text-rose-500" : "text-muted-foreground"}`}>
          {money(actual)} / {money(est)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/20" style={{ width: `${Math.min(100, (est / max) * 100)}%` }} />
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, (actual / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Estimator ---------- */

export interface VarianceRow {
  title: string;
  est: number;
  actual: number;
}

export function EstimatorView({
  variance,
  pendingCatalog,
  avgDeltaPct,
}: {
  variance: VarianceRow[];
  pendingCatalog: number;
  avgDeltaPct: number | null;
}) {
  const { lang, tr } = useTr();
  const money = (n: number) => formatMoney(n, lang);
  const L = {
    title: { en: "Estimate vs reality", pt: "Orçado vs real", es: "Estimado vs real" },
    hint: {
      en: "Estimated cost vs money actually spent, per job.",
      pt: "Custo orçado vs gasto real, por serviço.",
      es: "Costo estimado vs gasto real, por trabajo.",
    },
    accuracy: { en: "Avg deviation", pt: "Desvio médio", es: "Desvío medio" },
    pending: { en: "Catalog pending", pt: "Catálogo pendente", es: "Catálogo pendiente" },
    empty: {
      en: "No jobs with real spend yet — variance appears as you log expenses.",
      pt: "Nenhum job com gasto real ainda — a variância aparece quando você registra gastos.",
      es: "Sin trabajos con gasto real aún — la variación aparece al registrar gastos.",
    },
  } as const;
  const max = Math.max(1, ...variance.flatMap((v) => [v.est, v.actual]));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={tr(L.accuracy)}
            value={avgDeltaPct == null ? "—" : `${avgDeltaPct > 0 ? "+" : ""}${avgDeltaPct}%`}
            tone={avgDeltaPct == null ? undefined : Math.abs(avgDeltaPct) <= 10 ? "good" : "warn"}
          />
          <Stat label={tr(L.pending)} value={String(pendingCatalog)} tone={pendingCatalog > 0 ? "warn" : "good"} />
        </div>
        {variance.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          <div className="space-y-3">
            {variance.map((v) => (
              <PairRow key={v.title} label={v.title} est={v.est} actual={v.actual} max={max} money={money} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- PM ---------- */

export function PmView({
  budget,
  overdueTasks,
  changeOrdersTotal,
}: {
  budget: VarianceRow[];
  overdueTasks: number;
  changeOrdersTotal: number;
}) {
  const { lang, tr } = useTr();
  const money = (n: number) => formatMoney(n, lang);
  const L = {
    title: { en: "Budget vs actual", pt: "Budget vs real", es: "Presupuesto vs real" },
    hint: { en: "Active jobs — planned cost vs spent.", pt: "Jobs ativos — custo planejado vs gasto.", es: "Trabajos activos — costo planeado vs gastado." },
    overdue: { en: "Overdue tasks", pt: "Tarefas atrasadas", es: "Tareas atrasadas" },
    cos: { en: "Change orders", pt: "Aditivos", es: "Órdenes de cambio" },
    empty: { en: "No active jobs with spend yet.", pt: "Nenhum job ativo com gasto ainda.", es: "Sin trabajos activos con gasto aún." },
  } as const;
  const max = Math.max(1, ...budget.flatMap((v) => [v.est, v.actual]));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={tr(L.overdue)} value={String(overdueTasks)} tone={overdueTasks > 0 ? "bad" : "good"} />
          <Stat label={tr(L.cos)} value={money(changeOrdersTotal)} />
        </div>
        {budget.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          <div className="space-y-3">
            {budget.map((v) => (
              <PairRow key={v.title} label={v.title} est={v.est} actual={v.actual} max={max} money={money} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Superintendent ---------- */

export interface SiteHealth {
  id: string;
  name: string;
  jobs: number;
  overdue: number;
  incidentsOpen: number;
}

export function SuperintendentView({ sites }: { sites: SiteHealth[] }) {
  const { tr } = useTr();
  const L = {
    title: { en: "Site health", pt: "Saúde das obras", es: "Salud de las obras" },
    hint: { en: "One glance across every project.", pt: "Todas as obras num relance.", es: "Todas las obras de un vistazo." },
    jobs: { en: "jobs", pt: "serviços", es: "trabajos" },
    overdue: { en: "overdue", pt: "atrasadas", es: "atrasadas" },
    incidents: { en: "incidents", pt: "incidentes", es: "incidentes" },
    empty: { en: "No projects yet.", pt: "Nenhum projeto ainda.", es: "Sin proyectos aún." },
  } as const;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          sites.map((s) => {
            const tone =
              s.incidentsOpen > 0 ? "bg-rose-500" : s.overdue > 0 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {s.jobs} {tr(L.jobs)}
                  {s.overdue > 0 && <span className="text-amber-600"> · {s.overdue} {tr(L.overdue)}</span>}
                  {s.incidentsOpen > 0 && <span className="text-rose-600"> · {s.incidentsOpen} {tr(L.incidents)}</span>}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Safety ---------- */

export function SafetyView({
  open,
  daysSince,
  resolved,
}: {
  open: { green: number; yellow: number; red: number };
  daysSince: number | null;
  resolved: number;
}) {
  const { tr } = useTr();
  const L = {
    title: { en: "Safety", pt: "Segurança", es: "Seguridad" },
    hint: { en: "Incidents and streaks across all jobs.", pt: "Incidentes e sequência sem ocorrências.", es: "Incidentes y racha sin sucesos." },
    days: { en: "Days without incident", pt: "Dias sem incidente", es: "Días sin incidente" },
    resolved: { en: "Resolved", pt: "Resolvidos", es: "Resueltos" },
    open: { en: "Open incidents", pt: "Incidentes abertos", es: "Incidentes abiertos" },
  } as const;
  const total = open.green + open.yellow + open.red;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={tr(L.days)}
            value={daysSince == null ? "∞" : String(daysSince)}
            tone={daysSince == null || daysSince >= 30 ? "good" : daysSince >= 7 ? "warn" : "bad"}
          />
          <Stat label={tr(L.resolved)} value={String(resolved)} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{tr(L.open)} · {total}</p>
          <div className="flex gap-2">
            <span className="flex-1 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">{open.green}</span>
            <span className="flex-1 rounded-lg bg-amber-500/10 px-2 py-1.5 text-center text-sm font-bold text-amber-600 dark:text-amber-400">{open.yellow}</span>
            <span className="flex-1 rounded-lg bg-rose-500/10 px-2 py-1.5 text-center text-sm font-bold text-rose-600 dark:text-rose-400">{open.red}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Foreman ---------- */

export interface ForemanTask {
  id: string;
  title: string;
  jobTitle: string | null;
  overdue: boolean;
}
export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min: number;
  unit: string | null;
}

export function ForemanView({ tasks, lowStock }: { tasks: ForemanTask[]; lowStock: LowStockItem[] }) {
  const { tr } = useTr();
  const L = {
    title: { en: "Today on site", pt: "Hoje na obra", es: "Hoy en obra" },
    hint: { en: "Due and overdue tasks + material running low.", pt: "Tarefas de hoje e atrasadas + material acabando.", es: "Tareas de hoy y atrasadas + material por agotarse." },
    empty: { en: "Nothing due — all clear.", pt: "Nada vencendo — tudo em dia.", es: "Nada pendiente — todo al día." },
    low: { en: "Low stock", pt: "Estoque baixo", es: "Stock bajo" },
  } as const;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Hammer className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          <div className="grid gap-1">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.overdue ? "bg-rose-500" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  {t.jobTitle && <p className="truncate text-xs text-muted-foreground">{t.jobTitle}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {lowStock.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> {tr(L.low)}
            </p>
            <div className="grid gap-1">
              {lowStock.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-rose-500/5 px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-rose-600">
                    {i.quantity}/{i.min} {i.unit ?? ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Scheduler ---------- */

export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  tasks: { id: string; title: string; jobTitle: string | null }[];
}

export function SchedulerView({ days, unscheduled }: { days: ScheduleDay[]; unscheduled: number }) {
  const { lang, tr } = useTr();
  const L = {
    title: { en: "Next 14 days", pt: "Próximos 14 dias", es: "Próximos 14 días" },
    hint: { en: "What's scheduled, day by day.", pt: "O que está agendado, dia a dia.", es: "Lo programado, día a día." },
    unscheduled: { en: "unscheduled tasks", pt: "tarefas sem data", es: "tareas sin fecha" },
    empty: { en: "Nothing scheduled in the next two weeks.", pt: "Nada agendado nas próximas duas semanas.", es: "Nada programado en dos semanas." },
  } as const;
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {unscheduled > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <TriangleAlert className="h-3.5 w-3.5" /> {unscheduled} {tr(L.unscheduled)}
          </p>
        )}
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          days.map((d) => (
            <div key={d.date}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fmt(d.date)}
              </p>
              <div className="grid gap-1">
                {d.tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    {t.jobTitle && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t.jobTitle}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
