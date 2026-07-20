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
  // who am I (display name + employee/sub link)
  const [{ data: me }, { data: myMembership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    supabase
      .from("org_members")
      .select("employee_id, subcontractor_id")
      .eq("member_user_id", userId)
      .eq("org_id", orgId)
      .single(),
  ]);
  const employeeId = myMembership?.employee_id ?? null;
  const subId = myMembership?.subcontractor_id ?? null;

  // Subcontractor login: their world is the jobs shared with them.
  if (profile === "subcontractor") {
    if (!subId) {
      return { profile, name: me?.full_name || "—", projects: [], todayTasks: [], linked: false };
    }
    const [{ data: myShares }, { data: myContracts }, { data: myPayments }] = await Promise.all([
      supabase
        .from("estimate_shares")
        .select("id, estimate_id, status, created_at")
        .eq("subcontractor_id", subId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sub_contracts")
        .select("id, title, amount, status")
        .eq("subcontractor_id", subId)
        .eq("status", "signed"),
      supabase.from("sub_payments").select("contract_id, amount").eq("subcontractor_id", subId),
    ]);
    const paidByContract = new Map<string, number>();
    let paidTotal = 0;
    for (const p of myPayments ?? []) {
      paidTotal += Number(p.amount);
      if (p.contract_id)
        paidByContract.set(p.contract_id as string, (paidByContract.get(p.contract_id as string) ?? 0) + Number(p.amount));
    }
    const finance = {
      contracted: (myContracts ?? []).reduce((s, c) => s + Number(c.amount), 0),
      paid: paidTotal,
      contracts: (myContracts ?? []).map((c) => ({
        id: c.id as string,
        title: c.title as string,
        amount: Number(c.amount),
        paid: paidByContract.get(c.id as string) ?? 0,
      })),
    };
    const shareJobIds = [...new Set((myShares ?? []).map((s) => s.estimate_id as string))];
    const [{ data: subJobs }, { data: subTasks }] = await Promise.all([
      shareJobIds.length
        ? supabase.from("org_jobs_lite").select("id, title, status").in("id", shareJobIds)
        : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),
      shareJobIds.length
        ? supabase.from("job_tasks").select("id, estimate_id, title, status, due_date").in("estimate_id", shareJobIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const jobTitle = new Map((subJobs ?? []).map((j) => [j.id as string, j.title as string]));
    const today = new Date().toISOString().slice(0, 10);
    const projects: MemberProject[] = (myShares ?? []).map((s) => {
      const tasksFor = (subTasks ?? []).filter((t) => t.estimate_id === s.estimate_id);
      return {
        id: s.id as string,
        name: jobTitle.get(s.estimate_id as string) ?? "—",
        status: s.status as string,
        address: null,
        jobs: [],
        tasksDone: tasksFor.filter((t) => t.status === "done").length,
        tasksTotal: tasksFor.length,
        overdue: tasksFor.filter((t) => t.status !== "done" && t.due_date && (t.due_date as string) < today).length,
        incidentsOpen: 0,
      };
    });
    const todayTasks: MemberTask[] = (subTasks ?? [])
      .filter((t) => t.status !== "done" && t.due_date && (t.due_date as string) <= today)
      .slice(0, 6)
      .map((t) => ({
        id: t.id as string,
        title: t.title as string,
        jobTitle: jobTitle.get(t.estimate_id as string) ?? null,
        due: (t.due_date as string) ?? null,
        overdue: (t.due_date as string) < today,
      }));
    return { profile, name: me?.full_name || "—", projects, todayTasks, linked: true, finance };
  }
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
