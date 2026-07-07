import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

/**
 * Wood wall framing takeoff.
 * Method: "Estimating in Building Construction" (Dagostino/Peterson, 7th ed.),
 * Chapter 13 — Wood, sections 13-4 Wall Framing and 13-8 Labor:
 *  - Studs 16" o.c. → 0.75 studs per lf of wall + 1 to close the last space (Ex. 13-11)
 *  - +2 studs per corner (Ex. 13-12), +2 per wall intersection (Ex. 13-13)
 *  - +3 studs average per wall opening (Ex. 13-14)
 *  - Plates: single sole + double top = 3 × wall lf (Ex. 13-10)
 *  - Headers: doubled 2×12s extending one stud past each side of the opening
 *  - Sheathing: wall area / 32 sf per 4'×8' sheet (Ex. 13-17)
 * Stud spacing per WFCM 2018 (AWC): 16" or 24" on center for load-bearing walls.
 */
export function buildFraming(ctx: BuildCtx) {
  const { input, perimeter, waste, tierMult } = ctx;
  const height = input.wall_height_ft ?? 8;
  const wallLf = Math.ceil(input.linear_feet ?? perimeter);
  const wallSqft = Math.ceil(wallLf * height);
  const openings = (input.doors ?? 0) + (input.windows ?? 0) + (input.doorways ?? 0);
  // Corners: assume rectangular runs — roughly one corner per 25 lf, minimum 4.
  const corners = Math.max(4, Math.round(wallLf / 25));

  const scope = (input.material_name ?? "").toLowerCase();
  const isExterior = scope.includes("exterior") || scope.includes("sheath") || scope.includes("structure");

  if (input.conditions?.demo) {
    const demo = ctx.price("framing", ["demo"], {
      name: "Wall demo / removal",
      unit: "sqft",
      material: 0,
      labor: 1.5,
    });
    ctx.addLine(demo, "Demo existing wall", wallSqft, { kindLabor: "demo" });
  }

  // Studs (EST Ex. 13-11..13-14)
  const studCount = withWaste(
    Math.ceil(wallLf * 0.75) + 1 + corners * 2 + openings * 3,
    waste
  );
  const stud = ctx.price("framing", ["stud"], {
    name: 'Stud 2×4×8 (16" o.c.)',
    unit: "pc",
    material: 4.25,
    labor: 0,
  });
  ctx.addLine(stud, `Studs 2×4 — 16" o.c. (${studCount} pcs incl. waste)`, studCount, {
    materialMult: tierMult,
  });

  // Plates: sole + double top = 3 × lf (EST Ex. 13-10)
  const platesLf = withWaste(wallLf * 3, waste);
  const plates = ctx.price("framing", ["plate"], {
    name: "Plates 2×4 (sole + double top)",
    unit: "lf",
    material: 0.75,
    labor: 0,
  });
  ctx.addLine(plates, `Plates — sole + double top (${platesLf} lf)`, platesLf, {
    materialMult: tierMult,
  });

  // Headers: doubled 2×12, ~6 ft avg per opening incl. bearing (EST 13-4 Headers)
  if (openings > 0) {
    const headerLf = openings * 12; // 2 pcs × ~6 ft
    const header = ctx.price("framing", ["header"], {
      name: "Header 2×12 (doubled)",
      unit: "lf",
      material: 3.6,
      labor: 0,
    });
    ctx.addLine(header, `Headers 2×12 — ${openings} openings`, headerLf, {
      materialMult: tierMult,
    });
  }

  // Exterior sheathing: wall sf / 32 per sheet (EST Ex. 13-17)
  if (isExterior) {
    const sheets = Math.ceil(withWaste(wallSqft, waste) / 32);
    const osb = ctx.price("framing", ["sheathing"], {
      name: 'Wall sheathing OSB 7/16" 4×8',
      unit: "sheet",
      material: 22,
      labor: 0,
    });
    ctx.addLine(osb, `Wall sheathing (${sheets} sheets)`, sheets, { materialMult: tierMult });
  }

  // Assembly labor per wall sf. EST Fig. 13-55: walls 18–30 labor-hrs per MBM;
  // at ~1.1 bf/sf of wall that lands near $3/sf at typical carpenter rates.
  const labor = ctx.price("framing", ["labor"], {
    name: "Framing labor",
    unit: "sqft",
    material: 0,
    labor: isExterior ? 3.5 : 3.0,
  });
  ctx.addLine(labor, `Framing labor (${wallSqft} sqft wall)`, wallSqft);

  // Fasteners & connectors ≈ 5% of lumber material (PM: small tools 5% rule, Fig. 3.8)
  const lumberMat = ctx.items
    .filter((i) => i.kind === "material")
    .reduce((s, i) => s + i.total, 0);
  if (lumberMat > 0) {
    ctx.push("material", "Fasteners & connectors (~5%)", 1, "lot", Math.round(lumberMat * 0.05), true);
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(wallSqft / 600)), "load", 150, true);
  }

  ctx.sqft = wallSqft; // downstream: crew planning on wall area
}
