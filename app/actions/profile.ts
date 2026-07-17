"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(fields: {
  full_name?: string;
  company_name?: string;
  phone?: string;
  language?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  company_address?: string | null;
  company_email?: string | null;
  license_number?: string | null;
  overhead_pct?: number;
  profit_pct?: number;
  tax_pct?: number;
  min_margin_pct?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("profiles").update(fields).eq("id", user.id);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
