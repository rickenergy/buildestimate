"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertPriceItem(fields: {
  id?: string;
  trade: string;
  name: string;
  unit: string;
  material_cost: number;
  labor_cost: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { id, ...rest } = fields;
  if (id) {
    await supabase.from("price_items").update(rest).eq("id", id);
  } else {
    await supabase.from("price_items").insert({ user_id: user.id, ...rest });
  }
  revalidatePath("/prices");
}

/** Save a user override for a default price (same trade+name wins over default). */
export async function overrideDefaultPrice(fields: {
  trade: string;
  name: string;
  unit: string;
  material_cost: number;
  labor_cost: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("price_items")
    .select("id")
    .eq("trade", fields.trade)
    .eq("name", fields.name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("price_items")
      .update({
        unit: fields.unit,
        material_cost: fields.material_cost,
        labor_cost: fields.labor_cost,
      })
      .eq("id", existing.id);
  } else {
    // Brand-new catalog entries start pending — approved by the contractor/
    // admin before they're trusted (the account owner approves for now, until
    // multi-role accounts exist).
    await supabase.from("price_items").insert({ user_id: user.id, status: "pending", ...fields });
  }
  revalidatePath("/prices");
}

export async function approvePriceItem(id: string) {
  const supabase = await createClient();
  await supabase.from("price_items").update({ status: "approved" }).eq("id", id);
  revalidatePath("/prices");
}

export async function deletePriceItem(id: string) {
  const supabase = await createClient();
  await supabase.from("price_items").delete().eq("id", id);
  revalidatePath("/prices");
}
