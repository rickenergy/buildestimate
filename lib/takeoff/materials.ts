/**
 * Material takeoff — turn priced line items (which carry quantities in their
 * pricing unit: sqft / lf / pcs) into a purchasable "shopping list": how many
 * drywall sheets, gallons of paint, boxes of flooring, bags of thinset, boards
 * of lumber. The deterministic engine is already quantity-first; this only
 * converts those quantities into buy-units the GC (or their supplier) uses.
 *
 * Coverage numbers are US residential rules of thumb. They're conservative and
 * clearly labeled — the contractor edits before ordering. Waste is already
 * baked into the incoming material quantities by the pricing engine, so pack
 * counts are ordered off waste-included quantities (correct).
 */
import type { ComputedItem } from "./types";

// Coverage constants (documented so they're easy to tune per market).
const SHEET_SQFT = 32; // 4×8 sheet: drywall / OSB / plywood / cement board
const PAINT_SQFT_PER_GAL = 350; // per coat
const BOX_SQFT = 20; // flooring box (LVP/laminate/hardwood ~ 20 sqft)
const THINSET_SQFT_PER_BAG = 95; // 50 lb bag @ 1/4" trowel
const GROUT_SQFT_PER_BAG = 100;
const UNDERLAYMENT_ROLL_SQFT = 100;
const LUMBER_BOARD_FT = 16; // buy plates / trim / dimensional lumber in 16 ft lengths

export interface PurchasePack {
  packs: number; // whole units to buy (ceil, min 1)
  packLabel: string; // "sheets (4×8)" | "gallons" | "boxes (~20 sqft)" | "boards (16 ft)"
  coverageNote: string; // how the count was derived, e.g. "32 sqft/sheet"
}

export interface MaterialTakeoffLine {
  description: string;
  qty: number; // priced quantity (waste included), in `unit`
  unit: string; // sqft | lf | pcs | ea …
  purchase?: PurchasePack; // present when we know how to convert to buy-units
}

/** Number of coats stated in a line label, defaulting to 1. */
function coats(desc: string): number {
  const m = desc.match(/(\d+)\s*coat/i);
  return m ? Number(m[1]) : 1;
}

function pack(raw: number, packLabel: string, coverageNote: string): PurchasePack {
  return { packs: Math.max(1, Math.ceil(raw)), packLabel, coverageNote };
}

/** Convert one material line into a purchasable pack count, when we know how. */
export function toPurchasePack(line: { description: string; qty: number; unit: string }): PurchasePack | undefined {
  const d = line.description.toLowerCase();
  const u = line.unit.toLowerCase();

  if (u === "sqft") {
    if (/drywall|gypsum|sheathing|osb|plywood|backer|cement board/.test(d))
      return pack(line.qty / SHEET_SQFT, "sheets (4×8)", `${SHEET_SQFT} sqft/sheet`);
    if (/paint|primer|stain|sealer/.test(d)) {
      const c = coats(d);
      return pack((line.qty * c) / PAINT_SQFT_PER_GAL, "gallons", `${PAINT_SQFT_PER_GAL} sqft/gal × ${c} coat${c > 1 ? "s" : ""}`);
    }
    if (/thinset|mortar/.test(d)) return pack(line.qty / THINSET_SQFT_PER_BAG, "bags (50 lb)", `${THINSET_SQFT_PER_BAG} sqft/bag`);
    if (/grout/.test(d)) return pack(line.qty / GROUT_SQFT_PER_BAG, "bags", `${GROUT_SQFT_PER_BAG} sqft/bag`);
    if (/underlayment|underlay/.test(d)) return pack(line.qty / UNDERLAYMENT_ROLL_SQFT, "rolls", `${UNDERLAYMENT_ROLL_SQFT} sqft/roll`);
    if (/lvp|vinyl|laminate|hardwood|flooring|tile|plank/.test(d))
      return pack(line.qty / BOX_SQFT, `boxes (~${BOX_SQFT} sqft)`, `${BOX_SQFT} sqft/box`);
    return undefined;
  }

  if (u === "lf") {
    if (/plate|lumber|2×|2x|ledger|blocking|joist|rafter|header|beam|stud/.test(d))
      return pack(line.qty / LUMBER_BOARD_FT, `boards (${LUMBER_BOARD_FT} ft)`, `${LUMBER_BOARD_FT} ft/board`);
    if (/baseboard|trim|casing|crown|molding|shoe/.test(d))
      return pack(line.qty / LUMBER_BOARD_FT, `pieces (${LUMBER_BOARD_FT} ft)`, `${LUMBER_BOARD_FT} ft/piece`);
    return undefined;
  }

  // Already a discrete count — buy as-is.
  if (u === "pcs" || u === "ea" || u === "each") return pack(line.qty, line.unit, "count");
  return undefined;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate a priced estimate's MATERIAL lines into a purchasable list.
 * Merges duplicate materials (same description + unit) across rooms/trades so
 * "3 rooms of drywall" becomes one sheet count.
 */
export function materialTakeoff(items: ComputedItem[]): MaterialTakeoffLine[] {
  const byKey = new Map<string, MaterialTakeoffLine>();
  for (const it of items) {
    if (it.kind !== "material") continue;
    const key = `${it.description}__${it.unit}`;
    const cur = byKey.get(key);
    if (cur) cur.qty = round1(cur.qty + it.qty);
    else byKey.set(key, { description: it.description, qty: round1(it.qty), unit: it.unit });
  }
  const lines = [...byKey.values()];
  for (const l of lines) l.purchase = toPurchasePack(l);
  return lines;
}

/** Split a priced estimate's cost into material vs everything else (labor/demo/…). */
export function materialVsLabor(items: ComputedItem[]): { material: number; labor: number } {
  let material = 0;
  let labor = 0;
  for (const it of items) {
    if (it.kind === "material") material += it.total;
    else labor += it.total;
  }
  return { material: Math.round(material * 100) / 100, labor: Math.round(labor * 100) / 100 };
}
