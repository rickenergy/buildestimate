import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

export function buildDrywall(ctx: BuildCtx) {
  const { input, perimeter, waste } = ctx;
  const height = input.wall_height_ft ?? 8;
  // If dimensions describe a room, use wall area; a raw sqft is taken as board area.
  const hasRoomDims = input.areas.some((a) => a.length_ft && a.width_ft);
  const boardSqft = hasRoomDims ? Math.ceil(perimeter * height) : ctx.sqft;
  const matSqft = withWaste(boardSqft, waste);

  if (input.conditions?.demo) {
    const demo = ctx.price("drywall", ["demo"], {
      name: "Drywall demo",
      unit: "sqft",
      material: 0,
      labor: 0.7,
    });
    ctx.addLine(demo, "Drywall demo", boardSqft, { kindLabor: "demo" });
  }

  const hang = ctx.price("drywall", ["hang"], {
    name: 'Drywall 1/2" hang + finish (level 4)',
    unit: "sqft",
    material: 0.75,
    labor: 1.9,
  });
  ctx.addLine(hang, `Drywall hang + finish (${matSqft} sqft incl. waste)`, matSqft, {
    materialMult: ctx.tierMult,
  });

  if (input.conditions?.prep) {
    const texture = ctx.price("drywall", ["texture"], {
      name: "Texture match",
      unit: "sqft",
      material: 0.2,
      labor: 0.9,
    });
    ctx.addLine(texture, "Texture match", boardSqft);
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(boardSqft / 800)), "load", 150, true);
  }

  ctx.sqft = boardSqft;
}
