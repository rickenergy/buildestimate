"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseUsAddress } from "@/lib/geo";
import type { ProjectType } from "@/lib/types";

export interface CreateProjectInput {
  name: string;
  description?: string;
  project_type: ProjectType;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  client_name?: string;
}

/** Create a project, then send the user to its page. */
export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!input.name.trim()) throw new Error("Name required");

  // find or create client by name
  let clientId: string | null = null;
  const clientName = input.client_name?.trim();
  if (clientName) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", clientName)
      .limit(1)
      .maybeSingle();
    clientId =
      existing?.id ??
      (
        await supabase
          .from("clients")
          .insert({ user_id: user.id, name: clientName })
          .select("id")
          .single()
      ).data?.id ??
      null;
  }

  const parsed = parseUsAddress(input.address);
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      client_id: clientId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      project_type: input.project_type,
      address: input.address?.trim() || null,
      city: input.city?.trim() || parsed.city || null,
      state: input.state?.trim() || parsed.state || null,
      zip: input.zip?.trim() || parsed.zip || null,
    })
    .select("id")
    .single();

  if (error || !project) throw new Error(error?.message ?? "Failed to create project");

  revalidatePath("/projects");
  redirect(`/project/${project.id}`);
}

/** Update an existing project, then return to its page. */
export async function updateProject(projectId: string, input: CreateProjectInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!input.name.trim()) throw new Error("Name required");

  let clientId: string | null = null;
  const clientName = input.client_name?.trim();
  if (clientName) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", clientName)
      .limit(1)
      .maybeSingle();
    clientId =
      existing?.id ??
      (
        await supabase
          .from("clients")
          .insert({ user_id: user.id, name: clientName })
          .select("id")
          .single()
      ).data?.id ??
      null;
  }

  const parsed = parseUsAddress(input.address);
  const { error } = await supabase
    .from("projects")
    .update({
      client_id: clientId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      project_type: input.project_type,
      address: input.address?.trim() || null,
      city: input.city?.trim() || parsed.city || null,
      state: input.state?.trim() || parsed.state || null,
      zip: input.zip?.trim() || parsed.zip || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  revalidatePath(`/project/${projectId}`);
  redirect(`/project/${projectId}`);
}

export async function setProjectStatus(projectId: string, status: string) {
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  revalidatePath(`/project/${projectId}`);
  revalidatePath("/projects");
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  // estimates keep living (project_id set null via FK) — we only drop the project
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/projects");
  redirect("/projects");
}

/** Move an estimate into (or out of, with null) a project. */
export async function assignEstimateToProject(
  estimateId: string,
  projectId: string | null
) {
  const supabase = await createClient();
  await supabase.from("estimates").update({ project_id: projectId }).eq("id", estimateId);
  if (projectId) revalidatePath(`/project/${projectId}`);
  revalidatePath(`/estimate/${estimateId}`);
}
