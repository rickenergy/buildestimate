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
  license_number?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_expires?: string;
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
    license_number: fields.license_number?.trim() || null,
    insurance_provider: fields.insurance_provider?.trim() || null,
    insurance_policy_number: fields.insurance_policy_number?.trim() || null,
    insurance_expires: fields.insurance_expires || null,
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

// ── Employees ──────────────────────────────────────────────────
export async function upsertEmployee(fields: {
  id?: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  pay_rate?: number | null;
  pay_unit?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.name.trim()) throw new Error("Name required");
  const row = {
    user_id: user.id,
    name: fields.name.trim(),
    role: fields.role?.trim() || null,
    phone: fields.phone?.trim() || null,
    email: fields.email?.trim() || null,
    pay_rate: fields.pay_rate ?? null,
    pay_unit: fields.pay_unit?.trim() || null,
    notes: fields.notes?.trim() || null,
  };
  if (fields.id) {
    await supabase.from("employees").update(row).eq("id", fields.id).eq("user_id", user.id);
  } else {
    await supabase.from("employees").insert(row);
  }
  revalidatePath("/employees");
}

export async function deleteEmployee(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("employees").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/employees");
}

// ── Retail stores ──────────────────────────────────────────────
export async function upsertStore(fields: {
  id?: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.name.trim()) throw new Error("Name required");
  const row = {
    user_id: user.id,
    name: fields.name.trim(),
    category: fields.category?.trim() || null,
    address: fields.address?.trim() || null,
    phone: fields.phone?.trim() || null,
    website: fields.website?.trim() || null,
    notes: fields.notes?.trim() || null,
  };
  if (fields.id) {
    await supabase.from("retail_stores").update(row).eq("id", fields.id).eq("user_id", user.id);
  } else {
    await supabase.from("retail_stores").insert(row);
  }
  revalidatePath("/retail-stores");
}

export async function deleteStore(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("retail_stores").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/retail-stores");
}

// ── Company licenses & insurances (multiple entries) ────────────
export async function addCompanyLicense(fields: {
  license_type?: string;
  license_number: string;
  state?: string;
  expires?: string;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.license_number.trim()) throw new Error("License number required");
  await supabase.from("company_licenses").insert({
    user_id: user.id,
    license_type: fields.license_type?.trim() || null,
    license_number: fields.license_number.trim(),
    state: fields.state?.trim() || null,
    expires: fields.expires || null,
  });
  revalidatePath("/settings");
}

export async function deleteCompanyLicense(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("company_licenses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/settings");
}

export async function addCompanyInsurance(fields: {
  provider?: string;
  policy_number?: string;
  coverage_amount?: number | null;
  expires?: string;
}) {
  const { supabase, user } = await requireUser();
  await supabase.from("company_insurances").insert({
    user_id: user.id,
    provider: fields.provider?.trim() || null,
    policy_number: fields.policy_number?.trim() || null,
    coverage_amount: fields.coverage_amount ?? null,
    expires: fields.expires || null,
  });
  revalidatePath("/settings");
}

export async function deleteCompanyInsurance(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("company_insurances").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/settings");
}
