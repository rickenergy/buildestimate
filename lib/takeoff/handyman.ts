import type { BuildCtx } from "./context";
import { HANDYMAN_TASKS } from "../wizard/schema";
import { buildGeneric } from "./generic";

/**
 * Handyman takeoff: flat-rate per-task pricing (standard US handyman
 * price-book practice — small jobs are sold each, not by sqft).
 * Falls back to hourly generic labor when no task list is given.
 */
export function buildHandyman(ctx: BuildCtx) {
  const { input } = ctx;
  if (!input.tasks || input.tasks.length === 0) {
    buildGeneric(ctx, "handyman");
    return;
  }

  for (const task of input.tasks) {
    const def = HANDYMAN_TASKS.find((t) => t.key === task.key);
    const hit = ctx.price("handyman", def?.keywords ?? [task.key], {
      name: task.label,
      unit: "ea",
      material: def?.material ?? 20,
      labor: def?.labor ?? 60,
    });
    ctx.addLine(hit, task.label, task.qty, { materialMult: ctx.tierMult });
  }

  if (input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", 1, "load", 150, true);
  }

  // Crew planning proxy: ~1.5 labor-hours per task → sqft-equivalent basis
  const taskCount = input.tasks.reduce((s, t) => s + t.qty, 0);
  ctx.sqft = Math.max(ctx.sqft, taskCount * 45);
}
