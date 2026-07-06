import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

export function buildTile(ctx: BuildCtx) {
  const { input, sqft, waste, tierMult } = ctx;
  const materialName = input.material_name ?? "ceramic tile";
  const matSqft = withWaste(sqft, waste);

  const hit =
    ctx.priceByName("tile", materialName) ??
    ctx.price("tile", ["ceramic"], {
      name: `${materialName}`,
      unit: "sqft",
      material: 3.5,
      labor: 5,
    });
  ctx.addLine(hit, `${materialName} (${matSqft} sqft incl. ${Math.round(waste * 100)}% waste)`, matSqft, {
    materialMult: tierMult,
  });

  const backer = ctx.price("tile", ["cement", "board"], {
    name: "Cement board underlayment",
    unit: "sqft",
    material: 1.2,
    labor: 1.3,
  });
  ctx.addLine(backer, "Cement board underlayment", Math.ceil(sqft));

  if (input.conditions?.demo) {
    const demo = ctx.price("tile", ["demo"], {
      name: "Tile demo",
      unit: "sqft",
      material: 0,
      labor: 2,
    });
    ctx.addLine(demo, "Remove existing floor", sqft, { kindLabor: "demo" });
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(sqft / 400)), "load", 150, true);
  }
}
