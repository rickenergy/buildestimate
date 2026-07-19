"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import { roleSuggestions, roleLabel } from "@/lib/roles";
import { assignEmployee, unassignEmployee, type Assignment } from "@/app/actions/assignments";
import type { Employee } from "@/lib/types";
import { Users, Plus, Trash2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Project team", pt: "Equipe do projeto", es: "Equipo del proyecto" },
  subtitle: {
    en: "Assign crew and their role on this project.",
    pt: "Atribua a equipe e a função de cada um neste projeto.",
    es: "Asigna al equipo y su función en este proyecto.",
  },
  empty: { en: "No one assigned yet.", pt: "Ninguém atribuído ainda.", es: "Nadie asignado aún." },
  employee: { en: "Employee", pt: "Funcionário", es: "Empleado" },
  role: { en: "Role", pt: "Função", es: "Rol" },
  supervisor: { en: "Reports to (optional)", pt: "Responde a (opcional)", es: "Reporta a (opcional)" },
  none: { en: "—", pt: "—", es: "—" },
  add: { en: "Assign", pt: "Atribuir", es: "Asignar" },
} as const;

export function ProjectTeamCard({
  projectId,
  employees,
  assignments,
}: {
  projectId: string;
  employees: Employee[];
  assignments: Assignment[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  // employees not yet on the project
  const assignedIds = new Set(assignments.map((a) => a.employee_id));
  const available = employees.filter((e) => !assignedIds.has(e.id));

  function add() {
    if (!employeeId) return;
    startTransition(async () => {
      await assignEmployee({
        projectId,
        employeeId,
        role: role || null,
        supervisorId: supervisorId || null,
      });
      setEmployeeId("");
      setRole("");
      setSupervisorId("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await unassignEmployee(id, projectId);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          <ul className="grid gap-1.5">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.employee_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.role ? roleLabel(a.role, lang) : tr(L.none)}
                    {a.supervisor_name ? ` · → ${a.supervisor_name}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  aria-label="remove"
                  disabled={pending}
                  onClick={() => remove(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {available.length > 0 && (
          <div className="grid gap-2 rounded-lg bg-muted/40 p-2">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">{tr(L.employee)}…</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={tr(L.role)}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                list="assignment-role-suggestions"
              />
              <datalist id="assignment-role-suggestions">
                {roleSuggestions(lang).map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">{tr(L.supervisor)}</option>
                {employees
                  .filter((e) => e.id !== employeeId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button size="sm" variant="outline" className="w-full" disabled={pending || !employeeId} onClick={add}>
              <Plus className="mr-1 h-4 w-4" /> {tr(L.add)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
