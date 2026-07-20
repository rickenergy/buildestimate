"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { upsertSubcontractor, deleteSubcontractor, importSubcontractors } from "@/app/actions/network";
import { HardHat, Phone, Mail, Plus, Trash2, ArrowLeft, ShieldCheck, Download, Pencil } from "lucide-react";
import { TIER_STYLE, type SubTier } from "@/lib/sub-score";
import { exportToCsv } from "@/lib/csv-export";
import { CsvImport, type ImportField } from "@/components/csv-import";

const IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, aliases: ["name", "nome", "nombre"] },
  { key: "company", label: "Company", aliases: ["company", "empresa"] },
  { key: "trade", label: "Trade", aliases: ["trade", "especialidade", "oficio", "specialty"] },
  { key: "phone", label: "Phone", aliases: ["phone", "telefone", "tel", "celular", "mobile"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "correo"] },
  { key: "notes", label: "Notes", aliases: ["notes", "notas", "obs"] },
];
import Link from "next/link";
import type { Subcontractor } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Subcontractors", pt: "Subcontratados", es: "Subcontratistas" },
  subtitle: {
    en: "Your crew network — share jobs and assign work.",
    pt: "Sua rede — compartilhe trabalhos e distribua serviço.",
    es: "Tu red — comparte trabajos y asigna tareas.",
  },
  add: { en: "Add", pt: "Adicionar", es: "Agregar" },
  empty: { en: "No subcontractors yet.", pt: "Nenhum subcontratado ainda.", es: "Aún no hay subcontratistas." },
  name: { en: "Name", pt: "Nome", es: "Nombre" },
  company: { en: "Company", pt: "Empresa", es: "Empresa" },
  trade: { en: "Trade", pt: "Especialidade", es: "Oficio" },
  email: { en: "Email", pt: "Email", es: "Email" },
  phone: { en: "Phone", pt: "Telefone", es: "Teléfono" },
  license: { en: "License #", pt: "Nº da licença", es: "Nº de licencia" },
  insProvider: { en: "Insurance provider", pt: "Seguradora", es: "Aseguradora" },
  insPolicy: { en: "Policy #", pt: "Nº da apólice", es: "Nº de póliza" },
  insExpires: { en: "Insurance expires", pt: "Seguro expira em", es: "Seguro vence" },
  verified: { en: "Licensed & insured", pt: "Licenciado e segurado", es: "Con licencia y seguro" },
  notes: { en: "Notes", pt: "Notas", es: "Notas" },
  save: { en: "Save", pt: "Salvar", es: "Guardar" },
  edit: { en: "Edit", pt: "Editar", es: "Editar" },
  saved: { en: "Saved", pt: "Salvo", es: "Guardado" },
  back: { en: "Back to settings", pt: "Voltar às configurações", es: "Volver a ajustes" },
} as const;

export function SubcontractorsList({
  rows,
  scores,
}: {
  rows: Subcontractor[];
  scores?: Record<string, { score: number; tier: SubTier }>;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [adding, setAdding] = useState(false);

  function remove(id: string) {
    startTransition(async () => {
      await deleteSubcontractor(id);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold">{tr(L.title)}</h1>
          <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
        </div>
        <div className="flex gap-2">
          <CsvImport fields={IMPORT_FIELDS} onImport={importSubcontractors} />
          {rows.length > 0 && (
            <Button size="icon" variant="outline" className="shrink-0" aria-label="export csv" onClick={() => exportToCsv("subcontractors", rows)}>
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
                  <HardHat className="h-5 w-5" />
                </span>
                <Link href={`/subcontractors/${s.id}`} className="min-w-0 flex-1 text-left">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {s.name}
                    {s.trade ? <span className="text-muted-foreground"> · {s.trade}</span> : ""}
                    {scores?.[s.id] && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${TIER_STYLE[scores[s.id].tier].cls}`}
                      >
                        {TIER_STYLE[scores[s.id].tier].emoji} {scores[s.id].score}
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {s.company && <span className="truncate">{s.company}</span>}
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {s.email}
                      </span>
                    )}
                    {s.license_number && s.insurance_provider && (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <ShieldCheck className="h-3 w-3" /> {tr(L.verified)}
                      </span>
                    )}
                  </p>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="edit"
                  onClick={() => setEditing(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="delete"
                  onClick={() => remove(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Link
        href="/settings"
        className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium shadow-xs hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>

      <SubDialog
        open={adding || editing !== null}
        initial={editing ?? undefined}
        tr={tr}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </main>
  );
}

function SubDialog({
  open,
  initial,
  tr,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Subcontractor;
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "", company: "", trade: "", email: "", phone: "",
    license_number: "", insurance_provider: "", insurance_policy_number: "", insurance_expires: "",
    notes: "",
  });
  const [key, setKey] = useState("");

  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      trade: initial?.trade ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      license_number: initial?.license_number ?? "",
      insurance_provider: initial?.insurance_provider ?? "",
      insurance_policy_number: initial?.insurance_policy_number ?? "",
      insurance_expires: initial?.insurance_expires ?? "",
      notes: initial?.notes ?? "",
    });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? tr(L.edit) : tr(L.add)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={tr(L.name)}>
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr(L.company)}>
              <Input value={form.company} onChange={set("company")} />
            </Field>
            <Field label={tr(L.trade)}>
              <Input value={form.trade} onChange={set("trade")} />
            </Field>
          </div>
          <Field label={tr(L.phone)}>
            <Input value={form.phone} onChange={set("phone")} type="tel" />
          </Field>
          <Field label={tr(L.email)}>
            <Input value={form.email} onChange={set("email")} type="email" />
          </Field>
          <Field label={tr(L.license)}>
            <Input value={form.license_number} onChange={set("license_number")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr(L.insProvider)}>
              <Input value={form.insurance_provider} onChange={set("insurance_provider")} />
            </Field>
            <Field label={tr(L.insPolicy)}>
              <Input value={form.insurance_policy_number} onChange={set("insurance_policy_number")} />
            </Field>
          </div>
          <Field label={tr(L.insExpires)}>
            <Input type="date" value={form.insurance_expires} onChange={set("insurance_expires")} />
          </Field>
          <Field label={tr(L.notes)}>
            <Textarea value={form.notes} onChange={set("notes")} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={pending || !form.name.trim()}
            onClick={() =>
              startTransition(async () => {
                await upsertSubcontractor({ id: initial?.id, ...form });
                onSaved();
              })
            }
          >
            {tr(L.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
