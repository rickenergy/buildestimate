import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

/**
 * Finish Basement — guided composite. One "trade" that assembles the full
 * code-complete scope from a few inputs: floor area, ceiling height, egress
 * window count, and an optional bathroom rough-in flag.
 *
 * Derived quantities:
 *   floor  = sqft (from areas)
 *   wallLf = perimeter (from areas)
 *   wallSf = perimeter * ceiling height
 * See lib/standards.ts (FINISH_BASEMENT) for the code rules behind each line.
 */
export function buildFinishBasement(ctx: BuildCtx) {
  const { input, sqft: floor, perimeter, tierMult } = ctx;
  const height = input.wall_height_ft && input.wall_height_ft >= 7 ? input.wall_height_ft : 8;
  const wallLf = Math.ceil(perimeter > 0 ? perimeter : Math.sqrt(Math.max(floor, 1)) * 4);
  const wallSf = Math.ceil(wallLf * height);
  const ceilingSf = Math.ceil(floor);
  const boardSf = wallSf + ceilingSf; // drywall covers walls + ceiling unless drop
  const egress = Math.max(0, Math.floor(input.egress_windows ?? 0));
  const doors = Math.max(0, Math.floor(input.doors ?? 2));

  // 1. Moisture control over slab + foundation walls (code R406, do first)
  const moisture = ctx.price("finish_basement", ["moisture", "vapor"], {
    name: "Vapor barrier + dampproofing",
    unit: "sqft",
    material: 0.35,
    labor: 0.45,
  });
  ctx.addLine(moisture, "Moisture barrier (slab + walls)", floor + wallSf);

  // 2. Framing — furred 2x4 stud walls 16" OC against foundation
  const framing = ctx.price("finish_basement", ["framing", "stud"], {
    name: "Framed stud wall",
    unit: "lf",
    material: 6.5,
    labor: 7.5,
  });
  ctx.addLine(framing, `Perimeter framing (${height}ft walls)`, wallLf, { materialMult: tierMult });

  // 3. Insulation — R-15 cavity (climate-zone dependent), code N1102
  const insul = ctx.price("finish_basement", ["insulation"], {
    name: "Wall insulation R-15",
    unit: "sqft",
    material: 0.85,
    labor: 0.55,
  });
  ctx.addLine(insul, "Wall insulation (R-15)", wallSf, { materialMult: tierMult });

  // 4. Electrical — outlets, switches, lighting, GFCI/AFCI, alarms (allowance/sqft)
  const elec = ctx.price("finish_basement", ["electrical", "wiring"], {
    name: "Electrical rough + finish",
    unit: "sqft",
    material: 1.6,
    labor: 2.6,
  });
  ctx.addLine(elec, "Electrical (outlets, lighting, GFCI/AFCI, alarms)", ceilingSf);

  // 5. Drywall — hang + tape + finish, walls + ceiling
  const drywall = ctx.price("finish_basement", ["drywall"], {
    name: "Drywall hang + finish",
    unit: "sqft",
    material: 0.6,
    labor: 1.15,
  });
  ctx.addLine(drywall, "Drywall — walls + ceiling", Math.ceil(withWaste(boardSf, ctx.waste)));

  // 6. Egress window(s) + well — code R310, big cost driver
  if (egress > 0) {
    const eg = ctx.price("finish_basement", ["egress"], {
      name: "Egress window + well",
      unit: "ea",
      material: 950,
      labor: 1450,
    });
    ctx.addLine(eg, "Egress window + well (cut, buck, well)", egress, { materialMult: tierMult });
  }

  // 7. Flooring — underlayment + LVP (moisture-tolerant) over slab
  const floorFin = ctx.price("finish_basement", ["flooring", "lvp"], {
    name: "LVP over underlayment",
    unit: "sqft",
    material: 3.4,
    labor: 1.8,
  });
  ctx.addLine(floorFin, "Flooring (underlayment + LVP)", Math.ceil(withWaste(floor, ctx.waste)), {
    materialMult: tierMult,
  });

  // 8. Interior doors + trim (casing + baseboard)
  if (doors > 0) {
    const door = ctx.price("finish_basement", ["door"], {
      name: "Interior door — hung + cased",
      unit: "ea",
      material: 190,
      labor: 150,
    });
    ctx.addLine(door, "Interior doors (hung + cased)", doors, { materialMult: tierMult });
  }
  const base = ctx.price("finish_basement", ["baseboard", "trim"], {
    name: "Baseboard",
    unit: "lf",
    material: 1.9,
    labor: 2.1,
  });
  ctx.addLine(base, "Baseboard", wallLf);

  // 9. Optional bathroom / wet-bar rough-in (below-slab, must precede floor close)
  if (input.include_bathroom) {
    const bath = ctx.price("finish_basement", ["bathroom", "rough-in"], {
      name: "Bathroom rough-in (below-slab)",
      unit: "ea",
      material: 1600,
      labor: 2600,
    });
    ctx.addLine(bath, "Bathroom rough-in (drain, supply, ejector allow.)", 1, {
      materialMult: tierMult,
    });
  }

  // 10. Permit + inspections
  const permit = ctx.price("finish_basement", ["permit"], {
    name: "Building permit + inspections",
    unit: "ls",
    material: 0,
    labor: 650,
  });
  ctx.addLine(permit, "Permit + inspections", 1, { kindLabor: "other" });
}
