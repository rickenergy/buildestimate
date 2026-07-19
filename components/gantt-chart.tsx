"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { setTaskDates, type JobTask, type TaskStatus } from "@/app/actions/tasks";
import { CalendarRange } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Schedule", pt: "Cronograma", es: "Cronograma" },
  subtitle: {
    en: "Set start and due dates to build the timeline.",
    pt: "Defina início e prazo para montar o cronograma.",
    es: "Define inicio y fin para armar el cronograma.",
  },
  empty: {
    en: "No tasks yet — add tasks to schedule them.",
    pt: "Nenhuma tarefa ainda — adicione tarefas para agendar.",
    es: "Sin tareas aún — agrega tareas para programarlas.",
  },
  start: { en: "Start", pt: "Início", es: "Inicio" },
  due: { en: "Due", pt: "Prazo", es: "Fin" },
  today: { en: "Today", pt: "Hoje", es: "Hoy" },
} as const;

const STATUS_BG: Record<TaskStatus, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-primary",
  blocked: "bg-rose-500",
  todo: "bg-slate-400",
};

const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00") / 86_400_000);

export function GanttChart({ estimateId, tasks }: { estimateId: string; tasks: JobTask[] }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // read the clock once, off the render path (keeps render pure)
  const [todayNum] = useState(() => Math.floor(Date.now() / 86_400_000));

  function update(taskId: string, fields: { start_date?: string | null; due_date?: string | null }) {
    startTransition(async () => {
      await setTaskDates(taskId, estimateId, fields);
      router.refresh();
    });
  }

  // Compute the timeline range from any dated task.
  const dayNums: number[] = [];
  for (const t of tasks) {
    if (t.start_date) dayNums.push(dayNum(t.start_date));
    if (t.due_date) dayNums.push(dayNum(t.due_date));
  }
  const min = dayNums.length ? Math.min(...dayNums) : todayNum;
  const rawMax = dayNums.length ? Math.max(...dayNums) : todayNum + 14;
  const max = rawMax <= min ? min + 1 : rawMax;
  const span = max - min;
  const pct = (n: number) => ((n - min) / span) * 100;

  const hasTimeline = dayNums.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          <>
            {tasks.map((t) => {
              const s = t.start_date ? dayNum(t.start_date) : null;
              const d = t.due_date ? dayNum(t.due_date) : null;
              const left = s != null ? pct(s) : d != null ? pct(d) : 0;
              const right = d != null ? pct(d) : s != null ? pct(s) : 0;
              const width = Math.max(3, right - left);
              const dated = s != null || d != null;
              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <div className="flex shrink-0 gap-1">
                      <input
                        type="date"
                        aria-label={tr(L.start)}
                        value={t.start_date ?? ""}
                        disabled={pending}
                        onChange={(e) => update(t.id, { start_date: e.target.value || null })}
                        className="rounded border bg-background px-1 py-0.5 text-[11px]"
                      />
                      <input
                        type="date"
                        aria-label={tr(L.due)}
                        value={t.due_date ?? ""}
                        disabled={pending}
                        onChange={(e) => update(t.id, { due_date: e.target.value || null })}
                        className="rounded border bg-background px-1 py-0.5 text-[11px]"
                      />
                    </div>
                  </div>
                  {hasTimeline && (
                    <div className="relative h-2.5 rounded-full bg-muted">
                      {dated && (
                        <div
                          className={`absolute inset-y-0 rounded-full ${STATUS_BG[t.status]}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {hasTimeline && todayNum >= min && todayNum <= max && (
              <div className="relative h-4">
                <div
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${pct(todayNum)}%` }}
                >
                  <span className="text-[9px] font-semibold text-primary">{tr(L.today)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
