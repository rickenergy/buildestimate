"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { getServiceTasks, type TaskSource } from "@/app/actions/service-tasks";
import { ListChecks, Sparkles, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Service tasks", pt: "Tarefas do serviço", es: "Tareas del servicio" },
  subtitle: {
    en: "The execution steps for this job, in order.",
    pt: "Os passos de execução deste serviço, em ordem.",
    es: "Los pasos de ejecución de este trabajo, en orden.",
  },
  mapped: { en: "Standard", pt: "Padrão", es: "Estándar" },
  ai: { en: "AI", pt: "IA", es: "IA" },
  generate: { en: "Generate with AI", pt: "Gerar com IA", es: "Generar con IA" },
  refine: { en: "Refine with AI", pt: "Refinar com IA", es: "Refinar con IA" },
  empty: {
    en: "No standard sequence for this trade — generate one with AI.",
    pt: "Sem sequência padrão para este serviço — gere uma com IA.",
    es: "Sin secuencia estándar para este oficio — genera una con IA.",
  },
  needsKey: {
    en: "AI key not configured — showing the standard sequence only.",
    pt: "Chave de IA não configurada — mostrando só a sequência padrão.",
    es: "Clave de IA no configurada — mostrando solo la secuencia estándar.",
  },
} as const;

export function ServiceTasksCard({
  trade,
  description,
  initialTasks,
}: {
  trade: string;
  description?: string | null;
  initialTasks: string[] | null;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [tasks, setTasks] = useState<string[]>(initialTasks ?? []);
  const [source, setSource] = useState<TaskSource | null>(
    initialTasks && initialTasks.length > 0 ? "mapped" : null
  );
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setNote(null);
    startTransition(async () => {
      const res = await getServiceTasks(trade, description ?? undefined);
      if (res.needsKey) {
        setNote(tr(L.needsKey));
        return;
      }
      if (res.ok && res.tasks) {
        setTasks(res.tasks);
        setSource(res.source ?? "ai");
      }
    });
  }

  const hasTasks = tasks.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            {tr(L.title)}
          </CardTitle>
          {source && hasTasks && (
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs " +
                (source === "ai"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400")
              }
            >
              {source === "ai" ? tr(L.ai) : tr(L.mapped)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {hasTasks ? (
          <ol className="grid gap-1.5">
            {tasks.map((task, i) => (
              <li key={`${i}-${task}`} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{task}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        )}

        {note && <p className="text-xs text-amber-600 dark:text-amber-400">{note}</p>}

        <Button variant="outline" size="sm" className="w-full" disabled={pending} onClick={generate}>
          {pending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          {hasTasks ? tr(L.refine) : tr(L.generate)}
        </Button>
      </CardContent>
    </Card>
  );
}
