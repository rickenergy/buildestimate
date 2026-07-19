import type { createClient } from "@/lib/supabase/server";
import type { AccessProfile } from "@/lib/access-profiles";
import type { MemberHomeData, MemberProject, MemberTask } from "@/components/member-home";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Profiles that see every org project; the rest see only assigned ones. */
const SEES_ALL: AccessProfile[] = ["owner", "project_manager", "sales", "estimator"];

/**
 * Assemble the member home from the org data a member is allowed to read
 * (operational tables + the money-free org_jobs_lite view).
 */
export async function buildMemberHome(
  supabase: Supa,
  userId: string,
  orgId: string,
  profile: AccessProfile
): Promise<MemberHomeData> {
  // who am I (display name + employee link)
  const [{ data: me }, { data: myMembership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    supabase
      .from("org_members")
      .select("employee_id")
      .eq("member_user_id", userId)
      .eq("org_id", orgId)
      .single(),
  ]);
  const employeeId = myMembership?.employee_id ?? null;
  const linked = !!employeeId || SEES_ALL.includes(profile);

  // which projects
  let projectIds: string[] | null = null; // null = all org projects
  if (!SEES_ALL.includes(profile)) {
    if (!employeeId) {
      return {
        profile,
        name: me?.full_name || "—",
        projects: [],
        todayTasks: [],
        linked: false,
      };
    }
    const { data: mine } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("employee_id", employeeId);
    projectIds = [...new Set((mine ?? []).map((a) => a.project_id as string))];
    if (projectIds.length === 0) {
      return { profile, name: me?.full_name || "—", projects: [], todayTasks: [], linked };
    }
  }

  // projects + money-free jobs
  let projectQuery = supabase
    .from("projects")
    .select("id, name, status, address, city")
    .eq("user_id", orgId)
    .order("created_at", { ascending: false });
  if (projectIds) projectQuery = projectQuery.in("id", projectIds);
  const { data: projects } = await projectQuery;

  const pids = (projects ?? []).map((p) => p.id as string);
  const { data: jobs } = pids.length
    ? await supabase
        .from("org_jobs_lite")
        .select("id, project_id, title, status")
        .eq("user_id", orgId)
        .in("project_id", pids)
    : { data: [] as { id: string; project_id: string | null; title: string; status: string }[] };

  const jobIds = (jobs ?? []).map((j) => j.id as string);
  const [{ data: tasks }, { data: incidents }] = await Promise.all([
    jobIds.length
      ? supabase
          .from("job_tasks")
          .select("id, estimate_id, title, status, due_date")
          .in("estimate_id", jobIds)
      : Promise.resolve({ data: [] as never[] }),
    jobIds.length
      ? supabase
          .from("incidents")
          .select("id, estimate_id, status")
          .in("estimate_id", jobIds)
          .eq("status", "open")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const jobById = new Map((jobs ?? []).map((j) => [j.id as string, j]));

  const memberProjects: MemberProject[] = (projects ?? []).map((p) => {
    const pJobs = (jobs ?? []).filter((j) => j.project_id === p.id);
    const pJobIds = new Set(pJobs.map((j) => j.id as string));
    const pTasks = (tasks ?? []).filter((t) => pJobIds.has(t.estimate_id as string));
    const done = pTasks.filter((t) => t.status === "done").length;
    const overdue = pTasks.filter(
      (t) => t.status !== "done" && t.due_date && (t.due_date as string) < todayIso
    ).length;
    const inc = (incidents ?? []).filter((i) => pJobIds.has(i.estimate_id as string)).length;
    return {
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      address: (p.address as string | null) ?? (p.city as string | null),
      jobs: pJobs.map((j) => ({ id: j.id as string, title: j.title as string, status: j.status as string })),
      tasksDone: done,
      tasksTotal: pTasks.length,
      overdue,
      incidentsOpen: inc,
    };
  });

  const todayTasks: MemberTask[] = (tasks ?? [])
    .filter(
      (t) => t.status !== "done" && t.due_date && (t.due_date as string) <= todayIso
    )
    .sort((a, b) => ((a.due_date as string) < (b.due_date as string) ? -1 : 1))
    .slice(0, 6)
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      jobTitle: (jobById.get(t.estimate_id as string)?.title as string) ?? null,
      due: (t.due_date as string) ?? null,
      overdue: (t.due_date as string) < todayIso,
    }));

  return {
    profile,
    name: me?.full_name || "—",
    projects: memberProjects,
    todayTasks,
    linked,
  };
}
