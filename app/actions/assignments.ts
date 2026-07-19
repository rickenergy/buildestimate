"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface Assignment {
  id: string;
  project_id: string;
  employee_id: string;
  role: string | null;
  supervisor_id: string | null;
  employee_name: string | null;
  supervisor_name: string | null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function assignEmployee(fields: {
  projectId: string;
  employeeId: string;
  role?: string | null;
  supervisorId?: string | null;
}) {
  const { supabase, user } = await requireUser();
  if (!fields.employeeId) throw new Error("Employee required");
  const { error } = await supabase.from("project_assignments").upsert(
    {
      user_id: user.id,
      project_id: fields.projectId,
      employee_id: fields.employeeId,
      role: fields.role?.trim() || null,
      supervisor_id: fields.supervisorId || null,
    },
    { onConflict: "project_id,employee_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/project/${fields.projectId}`);
}

export async function unassignEmployee(id: string, projectId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("project_assignments").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath(`/project/${projectId}`);
}
