import type { ItemKind, MarginScore, QualityTier } from "@/lib/types";

export interface AreaInput {
  name?: string;
  length_ft?: number;
  width_ft?: number;
  sqft?: number;
}

export interface TakeoffConditions {
  demo?: boolean;
  demo_surface?: string; // carpet | vinyl | tile | drywall | general
  prep?: boolean;
  disposal?: boolean;
}

export interface TakeoffInput {
  trade: string;
  title?: string;
  areas: AreaInput[];
  wall_height_ft?: number;
  doorways?: number;
  windows?: number;
  doors?: number;
  linear_feet?: number; // fences, trim-only jobs
  slab_depth_in?: number; // concrete slab thickness (default 4")
  conditions?: TakeoffConditions;
  material_name?: string;
  quality_tier?: QualityTier;
  include_baseboard?: boolean;
  include_ceiling?: boolean;
  location?: string;
  start_timeframe?: string;
  client_name?: string;
  notes?: string;
  /** Handyman flat-rate tasks: key matches the price book, label is display-ready. */
  tasks?: { key: string; label: string; qty: number }[];
}

export interface PriceEntry {
  trade: string;
  name: string;
  unit: string;
  material_cost: number;
  labor_cost: number;
  isUserPrice: boolean;
}

export interface ComputedItem {
  kind: ItemKind;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total: number;
  is_estimated_price: boolean;
}

export interface TakeoffResult {
  items: ComputedItem[];
  area_sqft: number;
  waste_pct: number;
  crew_size: number;
  est_days: number;
  material_cost: number;
  labor_cost: number;
  demo_cost: number;
}

export interface EstimateTotals {
  subtotal: number;
  overhead_amount: number;
  profit_amount: number;
  tax_amount: number;
  total: number;
  margin_pct: number;
  margin_score: MarginScore;
}
