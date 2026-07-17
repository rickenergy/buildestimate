export type Language = "en" | "pt" | "es";

export type ClientStatus =
  | "lead"
  | "estimate_sent"
  | "follow_up"
  | "approved"
  | "lost";

/** CRM pipeline order — Kanban columns left → right. */
export const CLIENT_STAGES: ClientStatus[] = [
  "lead",
  "estimate_sent",
  "follow_up",
  "approved",
  "lost",
];

export type EstimateStatus = "draft" | "ready" | "sent" | "approved" | "lost";

export type QualityTier = "basic" | "standard" | "premium";

export type ItemKind = "material" | "labor" | "demo" | "disposal" | "other";

export type MarginScore = "healthy" | "medium" | "low";

export interface Profile {
  id: string;
  full_name: string;
  company_name: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  company_address: string | null;
  company_email: string | null;
  license_number: string | null;
  language: Language;
  overhead_pct: number;
  profit_pct: number;
  tax_pct: number;
  min_margin_pct: number;
  hourly_rate: number;
}

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subcontractor {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  trade: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  account_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  user_id: string;
  estimate_id: string | null;
  title: string;
  description: string | null;
  severity: "green" | "yellow" | "red";
  status: "open" | "resolved";
  assignee_sub_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  created_at: string;
  resolved_at: string | null;
  estimates?: { title: string } | null;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  unit_cost: number | null;
  min_quantity: number | null;
  is_equipment: boolean;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  trade: string;
  status: EstimateStatus;
  area_sqft: number | null;
  quality_tier: QualityTier;
  conditions: Record<string, unknown>;
  location: string | null;
  start_timeframe: string | null;
  material_cost: number;
  labor_cost: number;
  demo_cost: number;
  overhead_pct: number;
  profit_pct: number;
  tax_pct: number;
  total: number;
  margin_score: MarginScore | null;
  crew_size: number | null;
  est_days: number | null;
  project_meta: Record<string, unknown> | null;
  market_insights: Record<string, unknown> | null;
  start_date: string | null;
  end_date: string | null;
  project_id: string | null;
  estimate_type: EstimateType | null;
  materials_included: boolean | null;
  advisor_answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type EstimateType = "residential" | "commercial";

export type ProjectType = EstimateType | "mixed";
export type ProjectStatus = "active" | "on_hold" | "done" | "archived";

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  project_type: ProjectType;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  user_id: string;
  kind: ItemKind;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total: number;
  is_estimated_price: boolean;
  sort_order: number;
}

export interface PriceItem {
  id: string;
  user_id?: string;
  trade: string;
  name: string;
  unit: string;
  material_cost: number;
  labor_cost: number;
  notes: string | null;
}

export interface Proposal {
  id: string;
  estimate_id: string;
  user_id: string;
  token: string;
  scope: string;
  exclusions: string;
  terms: string;
  valid_until: string | null;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined";
  client_name_signed: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export const TRADES = [
  "flooring",
  "painting",
  "drywall",
  "tile",
  "roofing",
  "framing",
  "trim",
  "siding",
  "concrete",
  "remodeling",
  "landscaping",
  "cleaning",
  "finish_basement",
  "handyman",
] as const;

export type Trade = (typeof TRADES)[number];
