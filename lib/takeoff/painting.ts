import type { BuildCtx } from "./context";

export function buildPainting(ctx: BuildCtx) {
  const { input, sqft, perimeter } = ctx;
  const height = input.wall_height_ft ?? 8;
  // Wall area minus typical openings (~10%)
  const wallSqft = Math.ceil(perimeter * height * 0.9);

  const walls = ctx.price("painting", ["walls"], {
    name: "Interior paint - walls (2 coats)",
    unit: "sqft",
    material: 0.45,
    labor: 1.3,
  });
  ctx.addLine(walls, "Paint walls (2 coats)", wallSqft, { materialMult: ctx.tierMult });

  if (input.include_ceiling) {
    const ceiling = ctx.price("painting", ["ceiling"], {
      name: "Interior paint - ceiling",
      unit: "sqft",
      material: 0.4,
      labor: 1.1,
    });
    ctx.addLine(ceiling, "Paint ceiling", Math.ceil(sqft));
  }

  if (perimeter > 0) {
    const trim = ctx.price("painting", ["trim"], {
      name: "Trim & baseboard paint",
      unit: "lf",
      material: 0.35,
      labor: 1.5,
    });
    ctx.addLine(trim, "Paint trim & baseboards", Math.ceil(perimeter));
  }

  if (input.doors && input.doors > 0) {
    const doors = ctx.price("painting", ["door"], {
      name: "Door paint (both sides)",
      unit: "ea",
      material: 12,
      labor: 45,
    });
    ctx.addLine(doors, "Paint doors", input.doors);
  }

  if (input.conditions?.prep) {
    const primer = ctx.price("painting", ["primer"], {
      name: "Primer coat",
      unit: "sqft",
      material: 0.3,
      labor: 0.65,
    });
    ctx.addLine(primer, "Primer coat", wallSqft);
    const patch = ctx.price("painting", ["patch"], {
      name: "Drywall patch/repair",
      unit: "ea",
      material: 8,
      labor: 40,
    });
    ctx.addLine(patch, "Drywall patches", Math.max(2, Math.ceil(wallSqft / 400)));
  }

  // Painting labor is driven by wall area, not floor area.
  ctx.sqft = wallSqft;
}
