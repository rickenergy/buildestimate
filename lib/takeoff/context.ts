import type { ComputedItem, PriceEntry, TakeoffInput } from "./types";
import type { ItemKind } from "@/lib/types";
import { findPrice, findPriceLoose, fallbackPrice, type PriceHit } from "./prices";

const round2 = (n: number) => Math.round(n * 100) / 100;

export class BuildCtx {
  items: ComputedItem[] = [];

  constructor(
    public input: TakeoffInput,
    public prices: PriceEntry[],
    public sqft: number,
    public perimeter: number,
    public waste: number,
    public tierMult: number
  ) {}

  push(
    kind: ItemKind,
    description: string,
    qty: number,
    unit: string,
    unitCost: number,
    estimated: boolean
  ) {
    if (qty <= 0 || unitCost < 0) return;
    const q = round2(qty);
    const uc = round2(unitCost);
    this.items.push({
      kind,
      description,
      qty: q,
      unit,
      unit_cost: uc,
      total: round2(q * uc),
      is_estimated_price: estimated,
    });
  }

  /** Strict keyword lookup with fallback default. */
  price(
    trade: string,
    keywords: string[],
    fallback: { name: string; unit: string; material: number; labor: number }
  ): PriceHit {
    const entry = findPrice(this.prices, trade, keywords);
    if (entry) return { entry, estimated: !entry.isUserPrice };
    return fallbackPrice(trade, fallback.name, fallback.unit, fallback.material, fallback.labor);
  }

  /** Loose lookup by free-text material name. */
  priceByName(trade: string, query: string): PriceHit | null {
    const entry = findPriceLoose(this.prices, trade, query);
    if (!entry) return null;
    return { entry, estimated: !entry.isUserPrice };
  }

  /**
   * Push a material+labor pair from one price entry.
   * `materialMult` scales estimated material prices by quality tier.
   */
  addLine(
    hit: PriceHit,
    label: string,
    qty: number,
    opts: { kindMaterial?: ItemKind; kindLabor?: ItemKind; materialMult?: number } = {}
  ) {
    const { entry, estimated } = hit;
    const mult = estimated ? (opts.materialMult ?? 1) : 1;
    if (entry.material_cost > 0) {
      this.push(
        opts.kindMaterial ?? "material",
        label,
        qty,
        entry.unit,
        entry.material_cost * mult,
        estimated
      );
    }
    if (entry.labor_cost > 0) {
      this.push(
        opts.kindLabor ?? "labor",
        `${label} — labor`,
        qty,
        entry.unit,
        entry.labor_cost,
        estimated
      );
    }
  }
}
