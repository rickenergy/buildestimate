import { BuildCtx } from "./context";
import { totalSqft, totalPerimeterLf } from "./geometry";
import { wasteFactor, tierMultiplier } from "./waste";
import { planCrew } from "./labor";
import { buildFlooring } from "./flooring";
import { buildPainting } from "./painting";
import { buildDrywall } from "./drywall";
import { buildTile } from "./tile";
import { buildFraming } from "./framing";
import { buildTrim } from "./trim";
import { buildHandyman } from "./handyman";
import { buildRoofing, buildCleaning, buildGeneric, buildSiding, buildConcrete } from "./generic";
import type { PriceEntry, TakeoffInput, TakeoffResult } from "./types";

export { computeTotals } from "./margin";
export type * from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeTakeoff(input: TakeoffInput, prices: PriceEntry[]): TakeoffResult {
  const trade = input.trade.toLowerCase();
  const sqft = Math.ceil(totalSqft(input.areas ?? []));
  const perimeter = totalPerimeterLf(input.areas ?? []);
  const waste = wasteFactor(trade, input.material_name);
  const tierMult = tierMultiplier(input.quality_tier ?? "standard");

  const ctx = new BuildCtx(input, prices, sqft, perimeter, waste, tierMult);

  switch (trade) {
    case "flooring":
      buildFlooring(ctx);
      break;
    case "painting":
      buildPainting(ctx);
      break;
    case "drywall":
      buildDrywall(ctx);
      break;
    case "tile":
      buildTile(ctx);
      break;
    case "roofing":
      buildRoofing(ctx);
      break;
    case "framing":
      buildFraming(ctx);
      break;
    case "trim":
      buildTrim(ctx);
      break;
    case "siding":
      buildSiding(ctx);
      break;
    case "concrete":
      buildConcrete(ctx);
      break;
    case "handyman":
      buildHandyman(ctx);
      break;
    case "cleaning":
      buildCleaning(ctx);
      break;
    default:
      buildGeneric(ctx, trade);
  }

  const { crew_size, est_days } = planCrew(trade, ctx.sqft, Boolean(input.conditions?.demo));

  const sum = (kinds: string[]) =>
    round2(ctx.items.filter((i) => kinds.includes(i.kind)).reduce((s, i) => s + i.total, 0));

  return {
    items: ctx.items,
    area_sqft: sqft,
    waste_pct: Math.round(waste * 100),
    crew_size,
    est_days,
    material_cost: sum(["material"]),
    labor_cost: sum(["labor", "other"]),
    demo_cost: sum(["demo", "disposal"]),
  };
}
