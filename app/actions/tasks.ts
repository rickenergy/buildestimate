"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface JobTask {
  id: string;
  user_id: string;
  estimate_id: string;
  title: string;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function refresh(estimateId: string) {
  revalidatePath(`/estimate/${estimateId}`);
  revalidatePath("/finance");
}

export async function addTask(estimateId: string, title: string, dueDate?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!title.trim()) throw new Error("Empty title");

  const { error } = await supabase.from("job_tasks").insert({
    user_id: user.id,
    estimate_id: estimateId,
    title: title.trim(),
    due_date: dueDate || null,
  });
  if (error) throw new Error(error.message);
  refresh(estimateId);
}

export async function setTaskStatus(taskId: string, estimateId: string, status: TaskStatus) {
  const supabase = await createClient();
  await supabase
    .from("job_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  refresh(estimateId);
}

export async function deleteTask(taskId: string, estimateId: string) {
  const supabase = await createClient();
  await supabase.from("job_tasks").delete().eq("id", taskId);
  refresh(estimateId);
}

/** Set a task's schedule (start/due) for the Gantt view. */
export async function setTaskDates(
  taskId: string,
  estimateId: string,
  fields: { start_date?: string | null; due_date?: string | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await supabase
    .from("job_tasks")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id);
  refresh(estimateId);
}

export async function setProjectDates(
  estimateId: string,
  fields: { start_date?: string | null; end_date?: string | null }
) {
  const supabase = await createClient();
  await supabase.from("estimates").update(fields).eq("id", estimateId);
  refresh(estimateId);
}
