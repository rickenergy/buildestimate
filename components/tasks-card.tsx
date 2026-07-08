"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict, useLang } from "@/components/providers";
import { addTask, setTaskStatus, deleteTask, setProjectDates, type JobTask, type TaskStatus } from "@/app/actions/tasks";
import { TrafficLight } from "@/components/traffic-light";
import { taskLight } from "@/lib/alerts";
import { Circle, CircleDot, CheckCircle2, Ban, ListTodo, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  tasks: JobTask[];
  startDate: string | null;
  endDate: string | null;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
  blocked: "in_progress",
};

export function TasksCard({ estimateId, tasks, startDate, endDate }: Props) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const today = new Date();
  const done = tasks.filter((task) => task.status === "done").length;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await addTask(estimateId, title, due || undefined);
        setTitle("");
        setDue("");
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  function cycle(task: JobTask) {
    startTransition(async () => {
      await setTaskStatus(task.id, estimateId, NEXT_STATUS[task.status]);
    });
  }

  function block(task: JobTask) {
    startTransition(async () => {
      await setTaskStatus(task.id, estimateId, task.status === "blocked" ? "todo" : "blocked");
    });
  }

  const StatusIcon = ({ status }: { status: TaskStatus }) =>
    status === "done" ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : status === "in_progress" ? (
      <CircleDot className="h-5 w-5 text-primary" />
    ) : status === "blocked" ? (
      <Ban className="h-5 w-5 text-red-500" />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground" />
    );

  const fmt = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString(
      lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
      { day: "2-digit", month: "short" }
    );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ListTodo className="h-4 w-4 text-primary" /> {t.tasks.title}
          {tasks.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {done}/{tasks.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* project dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">{t.alerts.start}</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              defaultValue={startDate ?? ""}
              onBlur={(e) =>
                startTransition(async () => {
                  await setProjectDates(estimateId, { start_date: e.target.value || null });
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">{t.alerts.forecastEnd}</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              defaultValue={endDate ?? ""}
              onBlur={(e) =>
                startTransition(async () => {
                  await setProjectDates(estimateId, { end_date: e.target.value || null });
                })
              }
            />
          </div>
        </div>

        {/* task list */}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cycle(task)}
              aria-label={t.tasks.status[task.status]}
              disabled={pending}
            >
              <StatusIcon status={task.status} />
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate",
                  task.status === "done" && "text-muted-foreground line-through"
                )}
              >
                {task.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t.tasks.status[task.status]}
                {task.due_date ? ` · ${fmt(task.due_date)}` : ""}
              </p>
            </div>
            <TrafficLight light={taskLight(task, today)} compact />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={task.status === "blocked" ? t.tasks.unblock : t.tasks.block}
              onClick={() => block(task)}
              disabled={pending}
            >
              <Ban className={cn("h-3.5 w-3.5", task.status === "blocked" && "text-red-500")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={t.common.delete}
              onClick={() => startTransition(async () => deleteTask(task.id, estimateId))}
              disabled={pending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {/* add */}
        <form onSubmit={add} className="flex items-end gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.tasks.placeholder}
            className="h-9 flex-1"
          />
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-9 w-32 text-xs"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={pending || !title.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
