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
  estimates?: { title: string } | null;
}
