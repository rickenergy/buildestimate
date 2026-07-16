// Plain (non-"use server") module for finance constants + types.
// Server actions live in app/actions/finance.ts, which may only export async
// functions — so these shared values/types must live here to be importable by
// client components.

export type TransactionKind = "income" | "expense";

export const EXPENSE_CATEGORIES = [
  "materials",
  "labor",
  "fuel",
  "equipment",
  "disposal",
  "permits",
  "meals",
  "other",
] as const;

export const INCOME_CATEGORIES = ["deposit", "progress", "final", "other_income"] as const;

/**
 * What kind of outflow is being registered. Drives which fields the cadastro
 * shows. Grounded in construction cost-control practice (Estimating in Building
 * Construction, ch. on labor/material/equipment cost accounts).
 */
export const PURCHASE_TYPES = ["material", "service", "equipment", "labor", "other"] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number];

/**
 * Disposition of a purchased item — the heart of waste/loss tracking. Lets the
 * owner see where money leaks: desperdício (wasted), devolução (returned),
 * reaproveitamento em outro job (reused), quebra (broken), perda (lost).
 */
export const DISPOSITIONS = ["used", "wasted", "returned", "reused", "broken", "lost"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

/** Dispositions that represent leaked value (for metrics). */
export const LOSS_DISPOSITIONS: Disposition[] = ["wasted", "broken", "lost"];

/** Common purchase units. */
export const PURCHASE_UNITS = ["un", "sqft", "sqm", "lf", "m", "kg", "ton", "hr", "day", "gal", "box"] as const;

export interface JobTransaction {
  id: string;
  user_id: string;
  estimate_id: string | null;
  kind: TransactionKind;
  category: string;
  description: string | null;
  amount: number;
  occurred_at: string;
  created_at: string;
  // cadastro fields (nullable — legacy rows have none)
  purchase_type?: PurchaseType | null;
  vendor?: string | null;
  quantity?: number | null;
  unit?: string | null;
  photo_path?: string | null;
  invoice_path?: string | null;
  disposition?: Disposition | null;
  waste_value?: number | null;
  reused_estimate_id?: string | null;
  estimates?: { title: string } | null;
}
