import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstimateStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { Home, Building2, Layers, Plus, MapPin, FileText, Pencil } from "lucide-react";
import type { Project, Estimate } from "@/lib/types";

const TYPE_ICON = { residential: Home, commercial: Building2, mixed: Layers } as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user!.id)
    .single();
  const lang = (profile?.language as string) ?? "en";
  const t = getDict(lang);
  const nf = t.newflow;
  const money = (n: number) => formatMoney(n, lang);

  const [{ data: project }, { data: jobs }] = await Promise.all([
    supabase.from("projects").select("*, clients(name)").eq("id", id).single(),
    supabase
      .from("estimates")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!project) notFound();
  const p = project as Project & { clients: { name: string } | null };
  const list = (jobs ?? []) as Estimate[];
  const Icon = TYPE_ICON[p.project_type];
  const contractTotal = list.reduce((sum, j) => sum + (Number(j.total) || 0), 0);

  // default new-job type follows the project (mixed → let user choose)
  const newJobType = p.project_type === "mixed" ? "" : `&type=${p.project_type}`;

  return (
    <div className="pb-24">
      <PageHeader
        title={p.name}
        subtitle={nf.projectTypes[p.project_type]}
        backHref="/projects"
        action={
          <Link
            href={`/project/${p.id}/edit`}
            aria-label={nf.editProject}
            className="flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium transition hover:bg-muted active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" /> {nf.edit}
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* record highlight — Salesforce style */}
        <div className="surface-brand animate-fade-up flex items-center gap-3 rounded-3xl p-4 shadow-sm ring-1 ring-foreground/5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {nf.projectTypes[p.project_type]}
              {p.clients?.name ? ` · ${p.clients.name}` : ""}
            </p>
            {p.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {p.address}
              </p>
            )}
          </div>
        </div>
        {p.description && <p className="px-1 text-sm">{p.description}</p>}

        {/* aggregate highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{nf.jobs}</p>
            <p className="mt-1 text-2xl font-bold">{list.length}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{nf.contractTotal}</p>
            <p className="mt-1 text-2xl font-bold">{money(contractTotal)}</p>
          </div>
        </div>

      {/* jobs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">{nf.jobsInProject}</CardTitle>
          <Link
            href={`/estimate/new?project=${p.id}${newJobType}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> {nf.addJob}
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{nf.noJobs}</p>
          ) : (
            list.map((job) => (
              <Link
                key={job.id}
                href={`/estimate/${job.id}`}
                className="flex items-center gap-2 rounded-md border p-2.5 transition hover:border-primary"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{job.title}</span>
                <span className="text-sm tabular-nums">{money(Number(job.total))}</span>
                <EstimateStatusBadge status={job.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
