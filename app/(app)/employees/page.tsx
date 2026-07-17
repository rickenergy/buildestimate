import { createClient } from "@/lib/supabase/server";
import { EmployeesList } from "@/components/employees-list";
import type { Employee } from "@/lib/types";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");
  return <EmployeesList rows={(data ?? []) as Employee[]} />;
}
