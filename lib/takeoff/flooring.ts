import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

export function buildFlooring(ctx: BuildCtx) {
  const { input, sqft, perimeter, waste, tierMult } = ctx;
  const tier = input.quality_tier ?? "standard";
  const materialName = input.material_name ?? "luxury vinyl plank";
  const matSqft = withWaste(sqft, waste);

  // Main flooring material
  const hit =
    ctx.priceByName("flooring", materialName) ??
    ctx.price("flooring", ["lvp", tier], {
      name: `${materialName} (${tier})`,
      unit: "sqft",
      material: 3.75,
      labor: 2.25,
    });
  ctx.addLine(hit, `${materialName} (${matSqft} sqft incl. ${Math.round(waste * 100)}% waste)`, matSqft, {
    materialMult: tierMult,
  });

  // Underlayment for floating floors
  const name = materialName.toLowerCase();
  if (name.includes("vinyl") || name.includes("lvp") || name.includes("laminate")) {
    const under = ctx.price("flooring", ["underlayment"], {
      name: "Underlayment",
      unit: "sqft",
      material: 0.6,
      labor: 0.3,
    });
    ctx.addLine(under, "Underlayment", matSqft);
  }

  // Baseboard
  if (input.include_baseboard !== false && perimeter > 0) {
    const lf = Math.ceil(perimeter);
    const removal = ctx.price("flooring", ["baseboard", "removal"], {
      name: "Baseboard removal",
      unit: "lf",
      material: 0,
      labor: 0.75,
    });
    ctx.addLine(removal, "Baseboard removal", lf, { kindLabor: "demo" });
    const install = ctx.price("flooring", ["baseboard", "install"], {
      name: "Baseboard install",
      unit: "lf",
      material: 1.8,
      labor: 2.2,
    });
    ctx.addLine(install, "Baseboard install", lf);
  }

  // Transitions per doorway
  const doorways = input.doorways ?? Math.max(1, input.areas.length);
  const trans = ctx.price("flooring", ["transition"], {
    name: "Transition strip",
    unit: "ea",
    material: 22,
    labor: 15,
  });
  ctx.addLine(trans, "Transition strips", doorways);

  // Demo + disposal
  if (input.conditions?.demo) {
    const surface = (input.conditions.demo_surface ?? "carpet").toLowerCase();
    const demoKey = surface.includes("tile")
      ? ["tile", "removal"]
      : surface.includes("vinyl") || surface.includes("laminate")
        ? ["vinyl", "removal"]
        : ["carpet", "removal"];
    const demo = ctx.price("flooring", demoKey, {
      name: `${surface} removal`,
      unit: "sqft",
      material: 0,
      labor: 0.7,
    });
    ctx.addLine(demo, `Remove existing ${surface}`, sqft, { kindLabor: "demo" });
  }

  if (input.conditions?.prep) {
    const prep = ctx.price("flooring", ["prep"], {
      name: "Floor prep / leveling",
      unit: "sqft",
      material: 0.55,
      labor: 0.9,
    });
    ctx.addLine(prep, "Floor prep / leveling", sqft);
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    const loads = Math.max(1, Math.ceil(sqft / 600));
    const disp = ctx.price("flooring", ["disposal"], {
      name: "Debris disposal",
      unit: "load",
      material: 0,
      labor: 150,
    });
    ctx.addLine(disp, "Debris disposal", loads, { kindLabor: "disposal" });
  }
}
