import type { TaskStatus } from "@/app/actions/tasks";

/**
 * Traffic-light + incident rules, all pure and testable.
 * green  = on track · yellow = attention (due soon / tight) · red = incident.
 */

export type Light = "green" | "yellow" | "red";

export interface TaskLike {
  id: string;
  estimate_id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
}

export interface ProjectLike {
  id: string;
  title: string;
  status: string; // estimate status: draft/ready/sent/approved/lost
  est_days: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  total: number;
  material_cost: number;
  labor_cost: number;
  demo_cost: number;
  margin_score: string | null;
}

export type AlertKey =
  | "taskOverdue"
  | "taskDueSoon"
  | "taskBlocked"
  | "projectLate"
  | "projectEndingSoon"
  | "overBudget"
  | "lowMargin";

export interface Alert {
  key: AlertKey;
  light: Light;
  projectId: string;
  projectTitle: string;
  detail: string; // task title or amount — rendered after the i18n label
}

const DAY = 86_400_000;

const dateOnly = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00`);

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Per-task light: blocked/overdue = red, due within 2 days = yellow. */
export function taskLight(task: TaskLike, today: Date): Light {
  if (task.status === "done") return "green";
  if (task.status === "blocked") return "red";
  if (task.due_date) {
    const d = daysBetween(today, dateOnly(task.due_date));
    if (d < 0) return "red";
    if (d <= 2) return "yellow";
  }
  return "green";
}

/** Forecast: explicit end_date, else start (or creation) + est_days. */
export function forecastEnd(p: ProjectLike): Date {
  if (p.end_date) return dateOnly(p.end_date);
  const start = dateOnly(p.start_date ?? p.created_at);
  return new Date(start.getTime() + Math.ceil(p.est_days ?? 0) * DAY);
}

export function projectStart(p: ProjectLike): Date {
  return dateOnly(p.start_date ?? p.created_at);
}

/** % of the schedule elapsed (time-based when no tasks; task-based when they exist). */
export function projectProgress(p: ProjectLike, tasks: TaskLike[], today: Date): number {
  const own = tasks.filter((t) => t.estimate_id === p.id);
  if (own.length > 0) {
    return Math.round((own.filter((t) => t.status === "done").length / own.length) * 100);
  }
  const start = projectStart(p).getTime();
  const end = forecastEnd(p).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((today.getTime() - start) / (end - start)) * 100)));
}

/** Worst light wins for the project rollup. */
export function projectLight(
  p: ProjectLike,
  tasks: TaskLike[],
  spent: number,
  today: Date
): Light {
  const own = tasks.filter((t) => t.estimate_id === p.id);
  const lights = own.map((t) => taskLight(t, today));
  const estCost = p.material_cost + p.labor_cost + p.demo_cost;
  const allDone = own.length > 0 && own.every((t) => t.status === "done");

  if (lights.includes("red")) return "red";
  if (!allDone && daysBetween(today, forecastEnd(p)) < 0) return "red";
  if (spent > estCost && estCost > 0) return "red";
  if (lights.includes("yellow")) return "yellow";
  if (!allDone && daysBetween(today, forecastEnd(p)) <= 3) return "yellow";
  if (p.margin_score === "low") return "yellow";
  return "green";
}

/** Incident feed for the alarm screen, worst first. */
export function buildAlerts(
  projects: ProjectLike[],
  tasks: TaskLike[],
  spentByProject: Record<string, number>,
  today: Date
): Alert[] {
  const alerts: Alert[] = [];
  const active = projects.filter((p) => p.status !== "lost" && p.status !== "draft");

  for (const p of active) {
    const own = tasks.filter((t) => t.estimate_id === p.id);
    const allDone = own.length > 0 && own.every((t) => t.status === "done");

    for (const task of own) {
      const light = taskLight(task, today);
      if (task.status === "blocked") {
        alerts.push({ key: "taskBlocked", light: "red", projectId: p.id, projectTitle: p.title, detail: task.title });
      } else if (light === "red") {
        alerts.push({ key: "taskOverdue", light: "red", projectId: p.id, projectTitle: p.title, detail: task.title });
      } else if (light === "yellow") {
        alerts.push({ key: "taskDueSoon", light: "yellow", projectId: p.id, projectTitle: p.title, detail: task.title });
      }
    }

    const daysToEnd = daysBetween(today, forecastEnd(p));
    if (!allDone && daysToEnd < 0) {
      alerts.push({ key: "projectLate", light: "red", projectId: p.id, projectTitle: p.title, detail: `${-daysToEnd}d` });
    } else if (!allDone && daysToEnd <= 3) {
      alerts.push({ key: "projectEndingSoon", light: "yellow", projectId: p.id, projectTitle: p.title, detail: `${daysToEnd}d` });
    }

    const estCost = p.material_cost + p.labor_cost + p.demo_cost;
    const spent = spentByProject[p.id] ?? 0;
    if (estCost > 0 && spent > estCost) {
      alerts.push({ key: "overBudget", light: "red", projectId: p.id, projectTitle: p.title, detail: `+${Math.round(((spent - estCost) / estCost) * 100)}%` });
    }
    if (p.margin_score === "low") {
      alerts.push({ key: "lowMargin", light: "yellow", projectId: p.id, projectTitle: p.title, detail: "" });
    }
  }

  const rank = { red: 0, yellow: 1, green: 2 };
  return alerts.sort((a, b) => rank[a.light] - rank[b.light]);
}

/** Cumulative in/out series for the evolution line chart. */
export function cashSeries(
  transactions: { kind: string; amount: number; occurred_at: string }[],
  days: number,
  today: Date
): { date: string; income: number; expense: number }[] {
  const start = new Date(today.getTime() - (days - 1) * DAY);
  const byDay = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < days; i++) {
    byDay.set(new Date(start.getTime() + i * DAY).toISOString().slice(0, 10), {
      income: 0,
      expense: 0,
    });
  }
  for (const tx of transactions) {
    const key = tx.occurred_at.slice(0, 10);
    const slot = byDay.get(key);
    if (!slot) continue;
    if (tx.kind === "income") slot.income += Number(tx.amount);
    else slot.expense += Number(tx.amount);
  }
  let inc = 0;
  let exp = 0;
  return [...byDay.entries()].map(([date, v]) => {
    inc += v.income;
    exp += v.expense;
    return { date, income: Math.round(inc * 100) / 100, expense: Math.round(exp * 100) / 100 };
  });
}
