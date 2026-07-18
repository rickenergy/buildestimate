"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus } from "@/lib/types";

export async function upsertClient(fields: {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { id, ...rest } = fields;
  if (id) {
    await supabase.from("clients").update(rest).eq("id", id);
  } else {
    await supabase.from("clients").insert({ user_id: user.id, ...rest });
  }
  revalidatePath("/clients");
}

export async function updateClientStatus(id: string, status: ClientStatus) {
  const supabase = await createClient();
  await supabase.from("clients").update({ status }).eq("id", id);
  revalidatePath("/clients");
  revalidatePath("/home");
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/clients");
}

/** Bulk-insert clients from a CSV import (already mapped to our fields). */
export async function importClients(
  rows: { name: string; phone?: string; email?: string; address?: string; notes?: string }[]
): Promise<{ inserted: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const clean = rows
    .map((r) => ({
      user_id: user.id,
      name: (r.name ?? "").trim(),
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
      address: r.address?.trim() || null,
      notes: r.notes?.trim() || null,
    }))
    .filter((r) => r.name.length > 0)
    .slice(0, 2000); // safety cap

  if (clean.length === 0) return { inserted: 0 };
  const { error } = await supabase.from("clients").insert(clean);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  return { inserted: clean.length };
}
