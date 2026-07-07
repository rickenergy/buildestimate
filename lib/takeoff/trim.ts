import type { BuildCtx } from "./context";
import { withWaste } from "./waste";

/**
 * Finish carpentry (trim) takeoff — wood interior, exterior, and metal (aluminum) trim.
 * Method: "Estimating in Building Construction" (Dagostino/Peterson, 7th ed.),
 * section 13-7 Trim and Fig. 13-55 labor hours:
 *  - Trim is taken off by the linear foot (13-7)
 *  - Baseboard = wall lf minus door widths; order ~5% over (Ex. 13-25: 421 lf → order 440)
 *  - Labor: baseboard 1.5–2.5 hrs/100 lf, molding 2.0–4.0 hrs/100 lf,
 *    fascia 3.5–5.0 hrs/100 lf, soffit 2.0–3.5 hrs/100 lf (Fig. 13-55)
 */
export function buildTrim(ctx: BuildCtx) {
  const { input, perimeter, waste, tierMult } = ctx;
  const scope = (input.material_name ?? "").toLowerCase();
  const isMetal = scope.includes("metal") || scope.includes("alumin");
  const isExterior = isMetal || scope.includes("fascia") || scope.includes("soffit") || scope.includes("exterior");
  const doors = input.doors ?? 0;
  const windows = input.windows ?? 0;

  // Baseboard run: room perimeters minus 3 ft per door opening (EST Ex. 13-25)
  const baseLf = Math.ceil(input.linear_feet ?? Math.max(0, perimeter - doors * 3));

  if (input.conditions?.demo) {
    const demo = ctx.price("trim", ["demo"], {
      name: "Remove existing trim",
      unit: "lf",
      material: 0,
      labor: 0.6,
    });
    ctx.addLine(demo, "Remove existing trim", baseLf, { kindLabor: "demo" });
  }

  if (isExterior) {
    // Metal/exterior trim: aluminum fascia wrap + drip edge + soffit
    const fasciaLf = withWaste(baseLf, waste);
    const fascia = ctx.price("trim", isMetal ? ["aluminum", "fascia"] : ["fascia"], {
      name: isMetal ? "Aluminum fascia wrap" : "Fascia board 1×8",
      unit: "lf",
      material: isMetal ? 2.8 : 2.2,
      labor: isMetal ? 3.5 : 4.0, // EST Fig. 13-55: fascia 3.5–5.0 hrs/100 lf
    });
    ctx.addLine(fascia, isMetal ? `Aluminum fascia wrap (${fasciaLf} lf)` : `Fascia board (${fasciaLf} lf)`, fasciaLf, {
      materialMult: tierMult,
    });

    if (scope.includes("soffit") || isMetal) {
      const soffitSqft = Math.ceil(baseLf * 1.5); // ~18" soffit depth (EST Ex. 13-25: 1'6" wide)
      const soffit = ctx.price("trim", isMetal ? ["aluminum", "soffit"] : ["soffit"], {
        name: isMetal ? "Aluminum vented soffit" : "Plywood soffit 1/2\"",
        unit: "sqft",
        material: isMetal ? 2.1 : 1.6,
        labor: 2.5, // EST Fig. 13-55: soffit 2.0–3.5 hrs/100 lf
      });
      ctx.addLine(soffit, `Soffit (${soffitSqft} sqft)`, soffitSqft, { materialMult: tierMult });
    }

    if (isMetal) {
      const drip = ctx.price("trim", ["drip"], {
        name: "Drip edge / metal flashing",
        unit: "lf",
        material: 1.5,
        labor: 1.8,
      });
      ctx.addLine(drip, "Drip edge / flashing", fasciaLf);
    }
  } else {
    // Interior wood trim
    const orderLf = withWaste(baseLf, waste); // ~5% over (EST Ex. 13-25)
    const base = ctx.price("trim", ["baseboard"], {
      name: 'Baseboard 3-1/4" primed MDF',
      unit: "lf",
      material: 1.8,
      labor: 1.75, // EST Fig. 13-55: baseboard 1.5–2.5 hrs/100 lf
    });
    ctx.addLine(base, `Baseboard (${orderLf} lf incl. waste)`, orderLf, { materialMult: tierMult });

    if (doors > 0) {
      const casing = ctx.price("trim", ["door", "casing"], {
        name: "Door casing set",
        unit: "ea",
        material: 28,
        labor: 35,
      });
      ctx.addLine(casing, `Door casing (${doors})`, doors, { materialMult: tierMult });
    }
    if (windows > 0) {
      const wCasing = ctx.price("trim", ["window", "casing"], {
        name: "Window casing set",
        unit: "ea",
        material: 26,
        labor: 32,
      });
      ctx.addLine(wCasing, `Window casing (${windows})`, windows, { materialMult: tierMult });
    }

    // Crown molding: on premium tier or when explicitly asked
    if (scope.includes("crown") || input.quality_tier === "premium") {
      const crownLf = withWaste(Math.ceil(perimeter), waste);
      const crown = ctx.price("trim", ["crown"], {
        name: "Crown molding",
        unit: "lf",
        material: 3.2,
        labor: 3.0, // EST Fig. 13-55: molding 2.0–4.0 hrs/100 lf, ceiling work high end
      });
      ctx.addLine(crown, `Crown molding (${crownLf} lf)`, crownLf, { materialMult: tierMult });
    }
  }

  if (input.conditions?.demo || input.conditions?.disposal) {
    ctx.push("disposal", "Debris disposal", Math.max(1, Math.ceil(baseLf / 400)), "load", 150, true);
  }
}
