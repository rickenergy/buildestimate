"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLang } from "@/components/providers";
import { roleSuggestions } from "@/lib/roles";
import { upsertEmployee, deleteEmployee, importEmployees } from "@/app/actions/network";
import { User, Phone, Mail, Plus, Trash2, ArrowLeft, Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { CsvImport, type ImportField } from "@/components/csv-import";

const IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, aliases: ["name", "nome", "nombre"] },
  { key: "role", label: "Role", aliases: ["role", "função", "funcao", "cargo", "rol", "position"] },
  { key: "phone", label: "Phone", aliases: ["phone", "telefone", "tel", "celular", "mobile"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "correo"] },
  { key: "notes", label: "Notes", aliases: ["notes", "notas", "obs"] },
];
import type { Employee } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Employees", pt: "Funcionários", es: "Empleados" },
  subtitle: { en: "Your team members and their pay.", pt: "Sua equipe e a remuneração.", es: "Tu equipo y su pago." },
  add: { en: "Add", pt: "Adicionar", es: "Agregar" },
  empty: { en: "No employees yet.", pt: "Nenhum funcionário ainda.", es: "Aún no hay empleados." },
  name: { en: "Name", pt: "Nome", es: "Nombre" },
  role: { en: "Role", pt: "Função", es: "Rol" },
  phone: { en: "Phone", pt: "Telefone", es: "Teléfono" },
  email: { en: "Email", pt: "Email", es: "Email" },
  pay: { en: "Pay rate", pt: "Remuneração", es: "Pago" },
  unit: { en: "per", pt: "por", es: "por" },
  notes: { en: "Notes", pt: "Observações", es: "Notas" },
  save: { en: "Save", pt: "Salvar", es: "Guardar" },
  edit: { en: "Edit", pt: "Editar", es: "Editar" },
  back: { en: "Back to settings", pt: "Voltar às configurações", es: "Volver a ajustes" },
} as const;

export function EmployeesList({ rows }: { rows: Employee[] }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold">{tr(L.title)}</h1>
          <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
        </div>
        <div className="flex gap-2">
          <CsvImport fields={IMPORT_FIELDS} onImport={importEmployees} />
          {rows.length > 0 && (
            <Button size="icon" variant="outline" className="shrink-0" aria-label="export csv" onClick={() => exportToCsv("employees", rows)}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> {tr(L.add)}
          </Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((s, i) => (
            <Card key={s.id} className="animate-fade-up" style={{ ["--i" as string]: Math.min(i, 8) }}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(s)}>
                  <p className="truncate font-medium">
                    {s.name}
                    {s.role ? <span className="text-muted-foreground"> · {s.role}</span> : ""}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {s.pay_rate != null && <span>${Number(s.pay_rate)}/{s.pay_unit ?? "hr"}</span>}
                    {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>}
                  </p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="delete"
                  onClick={() => startTransition(async () => { await deleteEmployee(s.id); router.refresh(); })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Link href="/settings" className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium shadow-xs hover:bg-muted">
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>

      <Dlg
        open={adding || editing !== null}
        initial={editing ?? undefined}
        tr={tr}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); router.refresh(); }}
      />
    </main>
  );
}

function Dlg({
  open, initial, tr, onClose, onSaved,
}: {
  open: boolean;
  initial?: Employee;
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const lang = useLang() as Lang;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", pay_rate: "", pay_unit: "hr", notes: "" });
  const [key, setKey] = useState("");
  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      role: initial?.role ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      pay_rate: initial?.pay_rate != null ? String(initial.pay_rate) : "",
      pay_unit: initial?.pay_unit ?? "hr",
      notes: initial?.notes ?? "",
    });
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? tr(L.edit) : tr(L.add)}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label={tr(L.name)}><Input value={form.name} onChange={set("name")} required /></Field>
          <Field label={tr(L.role)}>
            <Input value={form.role} onChange={set("role")} list="employee-role-suggestions" />
            <datalist id="employee-role-suggestions">
              {roleSuggestions(lang).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr(L.pay)}><Input type="number" inputMode="decimal" value={form.pay_rate} onChange={set("pay_rate")} /></Field>
            <Field label={tr(L.unit)}>
              <select value={form.pay_unit} onChange={(e) => setForm((f) => ({ ...f, pay_unit: e.target.value }))} className="h-9 rounded-md border bg-transparent px-2 text-sm">
                <option value="hr">hr</option>
                <option value="day">day</option>
              </select>
            </Field>
          </div>
          <Field label={tr(L.phone)}><Input value={form.phone} onChange={set("phone")} type="tel" /></Field>
          <Field label={tr(L.email)}><Input value={form.email} onChange={set("email")} type="email" /></Field>
          <Field label={tr(L.notes)}><Textarea value={form.notes} onChange={set("notes")} rows={2} /></Field>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={pending || !form.name.trim()}
            onClick={() => startTransition(async () => {
              await upsertEmployee({ id: initial?.id, ...form, pay_rate: form.pay_rate ? Number(form.pay_rate) : null });
              onSaved();
            })}
          >
            {tr(L.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
