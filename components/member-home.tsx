"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { PROFILE_LABELS, type AccessProfile } from "@/lib/access-profiles";
import {
  HardHat,
  CalendarCheck,
  TriangleAlert,
  Layers,
  ChevronRight,
  Sun,
} from "lucide-react";

type Lang = "en" | "pt" | "es";

export interface MemberProject {
  id: string;
  name: string;
  status: string;
  address: string | null;
  jobs: { id: string; title: string; status: string }[];
  tasksDone: number;
  tasksTotal: number;
  overdue: number;
  incidentsOpen: number;
}

export interface MemberTask {
  id: string;
  title: string;
  jobTitle: string | null;
  due: string | null;
  overdue: boolean;
}

export interface MemberHomeData {
  profile: AccessProfile;
  name: string;
  projects: MemberProject[];
  todayTasks: MemberTask[];
  linked: boolean; // false = login not linked to an employee record yet
}

const L = {
  hello: { en: "Hello", pt: "Olá", es: "Hola" },
  today: { en: "Today", pt: "Hoje", es: "Hoy" },
  noTasks: {
    en: "Nothing due today. Enjoy the calm.",
    pt: "Nada vencendo hoje. Aproveita a calma.",
    es: "Nada para hoy. Disfruta la calma.",
  },
  myProjects: { en: "My projects", pt: "Meus projetos", es: "Mis proyectos" },
  noProjects: {
    en: "No projects assigned to you yet.",
    pt: "Nenhum projeto atribuído a você ainda.",
    es: "Aún no tienes proyectos asignados.",
  },
  notLinked: {
    en: "Ask the owner to link your login to your employee record to see your projects.",
    pt: "Peça ao dono para vincular seu login ao seu cadastro de funcionário para ver seus projetos.",
    es: "Pide al dueño vincular tu acceso a tu registro de empleado para ver tus proyectos.",
  },
  tasks: { en: "tasks", pt: "tarefas", es: "tareas" },
  overdue: { en: "overdue", pt: "atrasadas", es: "atrasadas" },
  incidents: { en: "open incidents", pt: "incidentes abertos", es: "incidentes abiertos" },
  jobs: { en: "jobs", pt: "serviços", es: "trabajos" },
} as const;

export function MemberHome({ data }: { data: MemberHomeData }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const profileLabel = PROFILE_LABELS[data.profile]?.[lang] ?? PROFILE_LABELS[data.profile]?.en;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      {/* Greeting */}
      <header className="animate-fade-up">
        <p className="text-sm text-muted-foreground">{tr(L.hello)},</p>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <HardHat className="h-3.5 w-3.5" />
            {profileLabel}
          </span>
        </div>
      </header>

      {/* Today */}
      <section className="animate-fade-up">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Sun className="h-4 w-4" /> {tr(L.today)}
        </h2>
        {data.todayTasks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
              {tr(L.noTasks)}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="grid gap-1 p-2">
              {data.todayTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      t.overdue ? "bg-rose-500" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    {t.jobTitle && (
                      <p className="truncate text-xs text-muted-foreground">{t.jobTitle}</p>
                    )}
                  </div>
                  {t.due && (
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        t.overdue ? "font-semibold text-rose-500" : "text-muted-foreground"
                      }`}
                    >
                      {t.due.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Projects */}
      <section className="animate-fade-up">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Layers className="h-4 w-4" /> {tr(L.myProjects)}
        </h2>
        {data.projects.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              {data.linked ? tr(L.noProjects) : tr(L.notLinked)}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5">
            {data.projects.map((p) => {
              const pct = p.tasksTotal > 0 ? Math.round((p.tasksDone / p.tasksTotal) * 100) : 0;
              return (
                <Card key={p.id} className="overflow-hidden">
                  <CardContent className="grid gap-2.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        {p.address && (
                          <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                        )}
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>

                    {p.tasksTotal > 0 && (
                      <div className="grid gap-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {p.tasksDone}/{p.tasksTotal} {tr(L.tasks)} · {pct}%
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.jobs.slice(0, 3).map((j) => (
                        <span
                          key={j.id}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {j.title}
                        </span>
                      ))}
                      {p.jobs.length > 3 && (
                        <span className="text-[11px] text-muted-foreground">
                          +{p.jobs.length - 3} {tr(L.jobs)}
                        </span>
                      )}
                    </div>

                    {(p.overdue > 0 || p.incidentsOpen > 0) && (
                      <div className="flex gap-2">
                        {p.overdue > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            {p.overdue} {tr(L.overdue)}
                          </span>
                        )}
                        {p.incidentsOpen > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <TriangleAlert className="h-3 w-3" />
                            {p.incidentsOpen} {tr(L.incidents)}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
