import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

export function buildRoofing(ctx: BuildCtx) {
  const { input, sqft, waste, tierMult } = ctx;
  const squares = Math.max(1, Math.ceil(withWaste(sqft, waste) / 100));

  if (input.conditions?.demo) {
    const tearOff = ctx.price("roofing", ["tear-off"], {
      name: "Tear-off (1 layer)",
      unit: "sq",
      material: 0,
      labor: 85,
    });
    ctx.addLine(tearOff, "Tear-off existing roof", squares, { kindLabor: "demo" });
  }

  const shingles =
    (input.material_name ? ctx.priceByName("roofing", input.material_name) : null) ??
    ctx.price("roofing", ["shingles"], {
      name: "Architectural shingles",
      unit: "sq",
      material: 130,
      labor: 220,
    });
  ctx.addLine(shingles, `Shingles (${squares} squares incl. waste)`, squares, {
    materialMult: tierMult,
  });

  const under = ctx.price("roofing", ["underlayment"], {
    name: "Underlayment synthetic",
    unit: "sq",
    material: 25,
    labor: 20,
  });
  ctx.addLine(under, "Synthetic underlayment", squares);

  if (ctx.perimeter > 0) {
    const drip = ctx.price("roofing", ["drip"], {
      name: "Drip edge",
      unit: "lf",
      material: 1.5,
      labor: 1.8,
    });
    ctx.addLine(drip, "Drip edge", Math.ceil(ctx.perimeter));
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    const dump = ctx.price("roofing", ["dumpster"], {
      name: "Dumpster / disposal",
      unit: "load",
      material: 0,
      labor: 450,
    });
    ctx.addLine(dump, "Dumpster / disposal", Math.max(1, Math.ceil(squares / 30)), {
      kindLabor: "disposal",
    });
  }
}

export function buildCleaning(ctx: BuildCtx) {
  const tierKey = ctx.input.quality_tier === "premium" ? ["deep"] : ["post-construction"];
  const clean = ctx.price("cleaning", tierKey, {
    name: "Post-construction cleaning",
    unit: "sqft",
    material: 0.05,
    labor: 0.45,
  });
  ctx.addLine(clean, "Cleaning", Math.ceil(ctx.sqft));

  if (ctx.input.windows && ctx.input.windows > 0) {
    const win = ctx.price("cleaning", ["window"], {
      name: "Window cleaning",
      unit: "ea",
      material: 0.5,
      labor: 8,
    });
    ctx.addLine(win, "Window cleaning", ctx.input.windows);
  }
}

/** Landscaping, remodeling, handyman: price-book driven with labor fallback. */
export function buildGeneric(ctx: BuildCtx, trade: string) {
  const { input, sqft } = ctx;
  const named = input.material_name ? ctx.priceByName(trade, input.material_name) : null;

  if (named) {
    const unit = named.entry.unit;
    const qty =
      unit === "sqft" ? Math.ceil(sqft * 1.05)
      : unit === "lf" ? Math.ceil(input.linear_feet ?? ctx.perimeter)
      : unit === "hr" ? Math.max(2, Math.ceil(sqft / 50))
      : unit === "yd" ? Math.max(1, Math.ceil(sqft / 100)) // ~3" depth coverage
      : Math.max(1, input.doorways ?? 1);
    ctx.addLine(named, named.entry.name, qty, { materialMult: ctx.tierMult });
  } else {
    // Labor-only fallback
    const hours = Math.max(2, Math.ceil(sqft / 50));
    const labor = ctx.price(trade === "handyman" ? "handyman" : "remodeling", ["labor"], {
      name: "General labor",
      unit: "hr",
      material: 0,
      labor: trade === "handyman" ? 60 : 65,
    });
    ctx.addLine(labor, "Labor", hours);
    if (input.material_name) {
      // Materials allowance when we can't price the material
      ctx.push("material", `${input.material_name} (allowance)`, 1, "ea", Math.max(150, sqft * 1.5), true);
    }
  }

  if (input.conditions?.demo) {
    const demo = ctx.price("remodeling", ["demo"], {
      name: "Demo general",
      unit: "sqft",
      material: 0,
      labor: 1.5,
    });
    ctx.addLine(demo, "Demolition", sqft, { kindLabor: "demo" });
  }
  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(sqft / 600)), "load", 150, true);
  }
}

/**
 * Siding takeoff: wall area = perimeter × height (gable allowance ~8%),
 * house wrap under siding, 12% waste. EST wall-sheathing method (Ex. 13-17)
 * applied to cladding; corners/J-channel folded into lf trim line.
 */
export function buildSiding(ctx: BuildCtx) {
  const { input, perimeter, waste, tierMult } = ctx;
  const height = input.wall_height_ft ?? 9;
  const hasRoomDims = input.areas.some((a) => a.length_ft && a.width_ft);
  const wallSqft = Math.ceil((hasRoomDims ? perimeter * height : ctx.sqft) * 1.08);
  const sidingSqft = withWaste(wallSqft, waste);

  if (input.conditions?.demo) {
    const tearOff = ctx.price("siding", ["demo"], {
      name: "Siding tear-off",
      unit: "sqft",
      material: 0,
      labor: 0.9,
    });
    ctx.addLine(tearOff, "Tear-off existing siding", wallSqft, { kindLabor: "demo" });
  }

  const wrap = ctx.price("siding", ["wrap"], {
    name: "House wrap",
    unit: "sqft",
    material: 0.25,
    labor: 0.3,
  });
  ctx.addLine(wrap, "House wrap", wallSqft);

  const siding =
    (input.material_name ? ctx.priceByName("siding", input.material_name) : null) ??
    ctx.price("siding", ["vinyl"], {
      name: "Vinyl siding installed",
      unit: "sqft",
      material: 2.4,
      labor: 3.2,
    });
  ctx.addLine(siding, `Siding (${sidingSqft} sqft incl. waste)`, sidingSqft, {
    materialMult: tierMult,
  });

  const cornersLf = Math.ceil(height * Math.max(4, Math.round(perimeter / 25)));
  ctx.push("material", "Corner posts / J-channel", cornersLf, "lf", 2.1, true);

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(wallSqft / 800)), "load", 150, true);
  }
  ctx.sqft = wallSqft;
}

/**
 * Concrete flatwork takeoff: 4" slab over 4" gravel base with wire mesh.
 * Volume: sqft × (4/12) / 27 = cy; order full yards (8% waste factor).
 */
export function buildConcrete(ctx: BuildCtx) {
  const { input, sqft, waste } = ctx;

  if (input.conditions?.demo) {
    const demo = ctx.price("concrete", ["demo"], {
      name: "Concrete demo / removal",
      unit: "sqft",
      material: 0,
      labor: 2.5,
    });
    ctx.addLine(demo, "Demo existing concrete", sqft, { kindLabor: "demo" });
  }

  const gravel = ctx.price("concrete", ["gravel"], {
    name: 'Gravel base 4"',
    unit: "sqft",
    material: 0.8,
    labor: 0.7,
  });
  ctx.addLine(gravel, "Gravel base", sqft);

  // Slab thickness drives material volume + price (base rate is per 4").
  const depthIn = input.slab_depth_in && input.slab_depth_in > 0 ? input.slab_depth_in : 4;
  const depthMult = depthIn / 4;
  const slab = ctx.price("concrete", ["slab"], {
    name: `Concrete slab ${depthIn}" (3000 psi)`,
    unit: "sqft",
    material: 3.5 * depthMult,
    labor: 4.0,
  });
  const slabSqft = withWaste(sqft, waste);
  const cy = Math.ceil((sqft * (depthIn / 12)) / 27 / (1 - waste));
  ctx.addLine(slab, `Concrete slab ${depthIn}" (${slabSqft} sqft ≈ ${cy} cy)`, slabSqft, {
    materialMult: ctx.tierMult,
  });

  ctx.push("material", "Wire mesh / rebar", sqft, "sqft", 0.45, true);

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Concrete disposal", Math.max(1, Math.ceil(sqft / 400)), "load", 250, true);
  }
}
