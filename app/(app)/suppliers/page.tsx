import { createClient } from "@/lib/supabase/server";
import { SuppliersList } from "@/components/suppliers-list";
import type { Supplier } from "@/lib/types";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  return <SuppliersList rows={(data ?? []) as Supplier[]} />;
}
