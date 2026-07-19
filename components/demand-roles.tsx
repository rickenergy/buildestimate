"use client";

import { useState } from "react";
import { useLang } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

type Lang = "en" | "pt" | "es";

/** Roles the dashboard is (or will be) scoped to. `gc` is live today. */
export type Role =
  | "gc"
  | "estimator"
  | "pm"
  | "superintendent"
  | "safety"
  | "foreman"
  | "scheduler";

const ROLE_LABEL: Record<Role, Record<Lang, string>> = {
  gc: { en: "Owner / GC", pt: "Dono / GC", es: "Dueño / GC" },
  estimator: { en: "Estimator", pt: "Orçamentista", es: "Estimador" },
  pm: { en: "Project Manager", pt: "Gerente de Obra", es: "Jefe de Proyecto" },
  superintendent: { en: "Superintendent", pt: "Superintendente", es: "Superintendente" },
  safety: { en: "Safety Manager", pt: "Segurança", es: "Seguridad" },
  foreman: { en: "Foreman", pt: "Encarregado", es: "Capataz" },
  scheduler: { en: "Scheduler", pt: "Cronograma", es: "Programador" },
};

// Why each non-GC role is not live yet — the épico it depends on.
const ROLE_BLOCKED: Record<Exclude<Role, "gc">, Record<Lang, string>> = {
  estimator: {
    en: "Needs the estimate variance & benchmark data (épico Estimator).",
    pt: "Precisa dos dados de variância e benchmark (épico Estimator).",
    es: "Requiere datos de variación y benchmark (épico Estimator).",
  },
  pm: {
    en: "Needs the Scheduler/Gantt épico (budget vs actual + timeline).",
    pt: "Precisa do épico Scheduler/Gantt (budget vs actual + cronograma).",
    es: "Requiere el épico Scheduler/Gantt (presupuesto vs real + cronograma).",
  },
  superintendent: {
    en: "Needs the roles↔project relation (épico #1) for multi-site health.",
    pt: "Precisa da relação cargos↔projeto (épico #1) para saúde multi-obra.",
    es: "Requiere la relación roles↔proyecto (épico #1) para salud multi-obra.",
  },
  safety: {
    en: "Needs the Safety checklist épico (inspections + photo proof).",
    pt: "Precisa do épico de checklist de segurança (inspeções + foto).",
    es: "Requiere el épico de checklist de seguridad (inspecciones + foto).",
  },
  foreman: {
    en: "Needs job_tasks per day + photo proof wired to a job.",
    pt: "Precisa das tarefas do dia (job_tasks) + foto de prova por obra.",
    es: "Requiere tareas del día (job_tasks) + foto de prueba por obra.",
  },
  scheduler: {
    en: "Needs the Scheduler/Gantt épico (timeline + crew capacity).",
    pt: "Precisa do épico Scheduler/Gantt (cronograma + capacidade da equipe).",
    es: "Requiere el épico Scheduler/Gantt (cronograma + capacidad del equipo).",
  },
};

const ROLE_ORDER: Role[] = ["gc", "estimator", "pm", "superintendent", "safety", "foreman", "scheduler"];

const L = {
  view: { en: "View as", pt: "Ver como", es: "Ver como" },
  soon: { en: "Coming soon", pt: "Em breve", es: "Próximamente" },
} as const;

/**
 * Role switcher for /demand. Each role renders its server-computed view;
 * roles without a view yet fall back to an honest "needs épico X" placeholder.
 */
export function DemandRoles({
  gc,
  views,
}: {
  gc: React.ReactNode;
  views?: Partial<Record<Role, React.ReactNode>>;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [role, setRole] = useState<Role>("gc");

  return (
    <div className="space-y-4">
      <div className="animate-fade-up">
        <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">{tr(L.view)}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`press shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                role === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tr(ROLE_LABEL[r])}
            </button>
          ))}
        </div>
      </div>

      {role === "gc" ? gc : (views?.[role] ?? <ComingSoon role={role} tr={tr} />)}
    </div>
  );
}

function ComingSoon({
  role,
  tr,
}: {
  role: Exclude<Role, "gc">;
  tr: (m: Record<Lang, string>) => string;
}) {
  return (
    <Card className="animate-fade-up">
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">
          {tr(ROLE_LABEL[role])} · {tr(L.soon)}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">{tr(ROLE_BLOCKED[role])}</p>
      </CardContent>
    </Card>
  );
}
