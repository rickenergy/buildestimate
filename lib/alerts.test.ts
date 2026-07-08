import { describe, it, expect } from "vitest";
import {
  taskLight,
  projectLight,
  buildAlerts,
  forecastEnd,
  projectProgress,
  cashSeries,
  type ProjectLike,
  type TaskLike,
} from "./alerts";

const today = new Date("2026-07-08T12:00:00");

const task = (over: Partial<TaskLike>): TaskLike => ({
  id: "t1",
  estimate_id: "p1",
  title: "Order materials",
  status: "todo",
  due_date: null,
  ...over,
});

const project = (over: Partial<ProjectLike>): ProjectLike => ({
  id: "p1",
  title: "Kitchen remodel",
  status: "approved",
  est_days: 10,
  start_date: "2026-07-01",
  end_date: null,
  created_at: "2026-06-30T00:00:00Z",
  total: 30000,
  material_cost: 10000,
  labor_cost: 8000,
  demo_cost: 1000,
  margin_score: "healthy",
  ...over,
});

describe("traffic light (green/yellow/red)", () => {
  it("overdue task = red, due in 2 days = yellow, no due = green, done = green", () => {
    expect(taskLight(task({ due_date: "2026-07-07" }), today)).toBe("red");
    expect(taskLight(task({ due_date: "2026-07-10" }), today)).toBe("yellow");
    expect(taskLight(task({}), today)).toBe("green");
    expect(taskLight(task({ status: "done", due_date: "2026-07-01" }), today)).toBe("green");
    expect(taskLight(task({ status: "blocked" }), today)).toBe("red");
  });

  it("project rolls up worst task light; over budget = red", () => {
    const p = project({ est_days: 30 }); // far from forecast end
    expect(projectLight(p, [task({})], 0, today)).toBe("green");
    expect(projectLight(p, [task({ due_date: "2026-07-01" })], 0, today)).toBe("red");
    expect(projectLight(p, [task({})], 25000, today)).toBe("red"); // spent > 19k est cost
    // within 3 days of forecast end with open tasks → yellow
    expect(projectLight(project({}), [task({})], 0, today)).toBe("yellow");
  });
});

describe("forecast & progress", () => {
  it("forecast end = start + est_days when no explicit end", () => {
    expect(forecastEnd(project({})).toISOString().slice(0, 10)).toBe("2026-07-11");
    expect(forecastEnd(project({ end_date: "2026-07-20" })).toISOString().slice(0, 10)).toBe("2026-07-20");
  });

  it("progress from tasks when they exist, else time-based", () => {
    const tasks = [task({ status: "done" }), task({ id: "t2" })];
    expect(projectProgress(project({}), tasks, today)).toBe(50);
    expect(projectProgress(project({}), [], today)).toBe(70); // day 7 of 10
  });
});

describe("incident feed", () => {
  it("collects overdue + over-budget, red first", () => {
    const alerts = buildAlerts(
      [project({})],
      [task({ due_date: "2026-07-01" })],
      { p1: 25000 },
      today
    );
    expect(alerts.some((a) => a.key === "taskOverdue")).toBe(true);
    expect(alerts.some((a) => a.key === "overBudget")).toBe(true);
    expect(alerts[0].light).toBe("red");
  });

  it("lost/draft projects excluded", () => {
    expect(buildAlerts([project({ status: "lost" })], [task({ due_date: "2026-01-01" })], {}, today)).toHaveLength(0);
  });
});

describe("cash series", () => {
  it("accumulates income and expense by day", () => {
    const s = cashSeries(
      [
        { kind: "income", amount: 100, occurred_at: "2026-07-07" },
        { kind: "expense", amount: 40, occurred_at: "2026-07-08" },
      ],
      3,
      today
    );
    expect(s).toHaveLength(3);
    expect(s[2].income).toBe(100);
    expect(s[2].expense).toBe(40);
  });
});
