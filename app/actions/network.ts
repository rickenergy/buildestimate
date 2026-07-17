"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

// ── Subcontractors ─────────────────────────────────────────────
export async function upsertSubcontractor(fields: {
  id?: string;
  name: string;
  company?: string;
  trade?: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.name.trim()) throw new Error("Name required");
  const row = {
    user_id: user.id,
    name: fields.name.trim(),
    company: fields.company?.trim() || null,
    trade: fields.trade?.trim() || null,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    notes: fields.notes?.trim() || null,
  };
  if (fields.id) {
    await supabase.from("subcontractors").update(row).eq("id", fields.id).eq("user_id", user.id);
  } else {
    await supabase.from("subcontractors").insert(row);
  }
  revalidatePath("/subcontractors");
}

export async function deleteSubcontractor(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("subcontractors").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/subcontractors");
}

// ── Suppliers ──────────────────────────────────────────────────
export async function upsertSupplier(fields: {
  id?: string;
  name: string;
  category?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  account_number?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.name.trim()) throw new Error("Name required");
  const row = {
    user_id: user.id,
    name: fields.name.trim(),
    category: fields.category?.trim() || null,
    contact_name: fields.contact_name?.trim() || null,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    address: fields.address?.trim() || null,
    account_number: fields.account_number?.trim() || null,
    notes: fields.notes?.trim() || null,
  };
  if (fields.id) {
    await supabase.from("suppliers").update(row).eq("id", fields.id).eq("user_id", user.id);
  } else {
    await supabase.from("suppliers").insert(row);
  }
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("suppliers").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/suppliers");
}

// ── Inventory ──────────────────────────────────────────────────
export async function upsertInventoryItem(fields: {
  id?: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number | null;
  min_quantity?: number | null;
  is_equipment?: boolean;
  supplier?: string;
  location?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.name.trim()) throw new Error("Name required");
  const row = {
    user_id: user.id,
    name: fields.name.trim(),
    category: fields.category?.trim() || null,
    quantity: fields.quantity ?? 0,
    unit: fields.unit?.trim() || null,
    unit_cost: fields.unit_cost ?? null,
    min_quantity: fields.min_quantity ?? null,
    is_equipment: fields.is_equipment ?? false,
    supplier: fields.supplier?.trim() || null,
    location: fields.location?.trim() || null,
    notes: fields.notes?.trim() || null,
  };
  if (fields.id) {
    await supabase.from("inventory_items").update(row).eq("id", fields.id).eq("user_id", user.id);
  } else {
    await supabase.from("inventory_items").insert(row);
  }
  revalidatePath("/inventory");
}

export async function deleteInventoryItem(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("inventory_items").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/inventory");
}
