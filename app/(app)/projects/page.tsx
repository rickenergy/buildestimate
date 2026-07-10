import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { FolderPlus, Home, Building2, Layers, ChevronRight } from "lucide-react";
import type { Project } from "@/lib/types";

const TYPE_ICON = { residential: Home, commercial: Building2, mixed: Layers } as const;

export default async function ProjectsPage() {
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

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: estimates } = await supabase
    .from("estimates")
    .select("project_id, total")
    .not("project_id", "is", null);

  const stats = new Map<string, { count: number; total: number }>();
  for (const e of estimates ?? []) {
    const key = e.project_id as string;
    const s = stats.get(key) ?? { count: 0, total: 0 };
    s.count += 1;
    s.total += Number(e.total) || 0;
    stats.set(key, s);
  }

  const list = (projects ?? []) as Project[];

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{nf.projectsTitle}</h1>
          <p className="text-sm text-muted-foreground">{nf.projectsSubtitle}</p>
        </div>
        <Link
          href="/project/new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <FolderPlus className="h-4 w-4" /> {nf.newProject}
        </Link>
      </header>

      {list.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{nf.noProjects}</p>
            <p className="text-sm text-muted-foreground">{nf.noProjectsHint}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((p) => {
            const Icon = TYPE_ICON[p.project_type];
            const s = stats.get(p.id) ?? { count: 0, total: 0 };
            return (
              <Link key={p.id} href={`/project/${p.id}`}>
                <Card className="transition hover:border-primary">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {nf.projectTypes[p.project_type]}
                        {" · "}
                        {s.count} {nf.jobs} · {money(s.total)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
