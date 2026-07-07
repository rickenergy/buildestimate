import type { Trade, QualityTier } from "@/lib/types";

/** Smart-script wizard: typed decision tree, fully deterministic (no AI). */

export type ProjectKind = "residential" | "commercial";

export type PropertyType =
  | "single_house"
  | "double_house"
  | "townhouse"
  | "apartment"
  | "mansion"
  | "office"
  | "retail"
  | "restaurant"
  | "warehouse";

export const PROPERTY_TYPES: Record<ProjectKind, PropertyType[]> = {
  residential: ["single_house", "double_house", "townhouse", "apartment", "mansion"],
  commercial: ["office", "retail", "restaurant", "warehouse"],
};

/** Room catalogue with typical US dimensions (ft) used as editable defaults. */
export type RoomKey =
  | "bedroom"
  | "suite"
  | "bathroom"
  | "half_bath"
  | "kitchen"
  | "living"
  | "dining"
  | "hallway"
  | "closet"
  | "laundry"
  | "garage"
  | "office_room"
  | "open_area";

export interface RoomPreset {
  key: RoomKey;
  length: number;
  width: number;
}

export const ROOM_PRESETS: RoomPreset[] = [
  { key: "bedroom", length: 12, width: 11 },
  { key: "suite", length: 14, width: 16 },
  { key: "bathroom", length: 8, width: 8 },
  { key: "half_bath", length: 5, width: 4 },
  { key: "kitchen", length: 12, width: 14 },
  { key: "living", length: 16, width: 14 },
  { key: "dining", length: 12, width: 12 },
  { key: "hallway", length: 4, width: 12 },
  { key: "closet", length: 4, width: 6 },
  { key: "laundry", length: 6, width: 8 },
  { key: "garage", length: 20, width: 20 },
  { key: "office_room", length: 10, width: 12 },
  { key: "open_area", length: 30, width: 40 },
];

export const roomPreset = (key: RoomKey): RoomPreset =>
  ROOM_PRESETS.find((r) => r.key === key) ?? ROOM_PRESETS[0];

/** Typical door/window counts per room — feeds framing headers & trim casing. */
export const ROOM_OPENINGS: Record<RoomKey, { doors: number; windows: number }> = {
  bedroom: { doors: 1, windows: 1 },
  suite: { doors: 2, windows: 2 },
  bathroom: { doors: 1, windows: 1 },
  half_bath: { doors: 1, windows: 0 },
  kitchen: { doors: 1, windows: 1 },
  living: { doors: 2, windows: 2 },
  dining: { doors: 1, windows: 1 },
  hallway: { doors: 2, windows: 0 },
  closet: { doors: 1, windows: 0 },
  laundry: { doors: 1, windows: 0 },
  garage: { doors: 2, windows: 1 },
  office_room: { doors: 1, windows: 1 },
  open_area: { doors: 2, windows: 4 },
};

/** Default room counts per property type — starting point, user adjusts. */
export const PROPERTY_ROOM_DEFAULTS: Record<PropertyType, Partial<Record<RoomKey, number>>> = {
  apartment: { bedroom: 2, bathroom: 1, kitchen: 1, living: 1, hallway: 1, closet: 2 },
  townhouse: {
    bedroom: 2, suite: 1, bathroom: 1, half_bath: 1, kitchen: 1, living: 1,
    dining: 1, hallway: 2, closet: 3, laundry: 1, garage: 1,
  },
  single_house: {
    bedroom: 2, suite: 1, bathroom: 2, kitchen: 1, living: 1, dining: 1,
    hallway: 1, closet: 3, laundry: 1, garage: 1,
  },
  double_house: {
    bedroom: 4, suite: 1, bathroom: 2, half_bath: 1, kitchen: 2, living: 2,
    dining: 1, hallway: 2, closet: 4, laundry: 1, garage: 1,
  },
  mansion: {
    bedroom: 3, suite: 3, bathroom: 4, half_bath: 2, kitchen: 1, living: 2,
    dining: 1, hallway: 3, closet: 6, laundry: 1, garage: 3, office_room: 1,
  },
  office: { open_area: 1, bathroom: 2, kitchen: 1, hallway: 1 },
  retail: { open_area: 1, bathroom: 1 },
  restaurant: { open_area: 1, kitchen: 1, bathroom: 2 },
  warehouse: { open_area: 1, bathroom: 1, office_room: 1 },
};

/** Work types offered by the wizard. `metal_trim` maps to trade "trim" + metal scope. */
export type WorkKey = Trade | "metal_trim";

export const WORK_KEYS: WorkKey[] = [
  "flooring",
  "painting",
  "drywall",
  "tile",
  "framing",
  "trim",
  "metal_trim",
  "roofing",
  "siding",
  "concrete",
  "remodeling",
  "landscaping",
  "cleaning",
  "handyman",
];

/** Whole-property trades: measured on total footprint, not per selected room. */
export const WHOLE_PROPERTY_WORK: WorkKey[] = ["roofing", "siding", "landscaping", "concrete"];

export interface WizardRoom {
  id: string;
  key: RoomKey;
  length: number;
  width: number;
  selected: boolean; // included in the work scope
}

export interface WizardState {
  kind: ProjectKind;
  property: PropertyType;
  rooms: WizardRoom[];
  works: WorkKey[];
  wallHeight: number;
  tier: QualityTier;
  demo: boolean;
  prep: boolean;
  disposal: boolean;
  doorsPerRoom: number;
  windowsPerRoom: number;
  clientName: string;
  location: string;
}

export function defaultRooms(property: PropertyType): WizardRoom[] {
  const rooms: WizardRoom[] = [];
  const defaults = PROPERTY_ROOM_DEFAULTS[property];
  let id = 0;
  for (const [key, count] of Object.entries(defaults) as [RoomKey, number][]) {
    const preset = roomPreset(key);
    for (let i = 0; i < count; i++) {
      rooms.push({ id: `${key}-${id++}`, key, length: preset.length, width: preset.width, selected: true });
    }
  }
  return rooms;
}

export function workToTrade(work: WorkKey): { trade: Trade; material_name?: string } {
  if (work === "metal_trim") return { trade: "trim", material_name: "metal aluminum fascia soffit" };
  return { trade: work };
}

/**
 * Handyman task catalogue — flat-rate small jobs priced each,
 * standard US handyman price-book practice. Keys match i18n + price book.
 */
export interface HandymanTaskDef {
  key: string;
  keywords: string[]; // price-book lookup
  material: number; // fallback $ each
  labor: number;
}

export const HANDYMAN_TASKS: HandymanTaskDef[] = [
  { key: "door_repair", keywords: ["door", "repair"], material: 10, labor: 45 },
  { key: "door_install", keywords: ["door", "install"], material: 120, labor: 90 },
  { key: "faucet", keywords: ["faucet"], material: 85, labor: 75 },
  { key: "toilet", keywords: ["toilet"], material: 180, labor: 120 },
  { key: "caulking", keywords: ["caulk"], material: 8, labor: 60 },
  { key: "drywall_patch", keywords: ["drywall", "patch"], material: 15, labor: 85 },
  { key: "light_fixture", keywords: ["light", "fixture"], material: 60, labor: 65 },
  { key: "ceiling_fan", keywords: ["ceiling", "fan"], material: 110, labor: 95 },
  { key: "tv_mount", keywords: ["tv", "mount"], material: 25, labor: 80 },
  { key: "shelving", keywords: ["shelf"], material: 45, labor: 70 },
  { key: "smoke_detector", keywords: ["smoke"], material: 25, labor: 30 },
  { key: "weatherstripping", keywords: ["weatherstrip"], material: 20, labor: 50 },
  { key: "baseboard_repair", keywords: ["baseboard", "repair"], material: 10, labor: 60 },
  { key: "pressure_wash", keywords: ["pressure", "wash"], material: 0, labor: 180 },
  { key: "gutter_clean", keywords: ["gutter", "clean"], material: 0, labor: 150 },
];

export interface HandymanSelection {
  taskKey: string;
  roomId: string | null; // null = whole property / exterior
  qty: number;
}
