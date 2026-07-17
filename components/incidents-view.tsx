"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/providers";
import {
  createIncident,
  resolveIncident,
  reopenIncident,
  deleteIncident,
} from "@/app/actions/incidents";
import { AlertTriangle, Plus, Trash2, ArrowLeft, Mail, User, CircleCheck, RotateCcw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Incident, Subcontractor } from "@/lib/types";

type Lang = "en" | "pt" | "es";
type Sev = "green" | "yellow" | "red";

const SEV: Record<Sev, { label: Record<Lang, string>; dot: string; ring: string }> = {
  green: { label: { en: "Low", pt: "Baixo", es: "Bajo" }, dot: "bg-emerald-500", ring: "ring-emerald-500/30" },
  yellow: { label: { en: "Attention", pt: "Atenção", es: "Atención" }, dot: "bg-amber-500", ring: "ring-amber-500/30" },
  red: { label: { en: "Urgent", pt: "Urgente", es: "Urgente" }, dot: "bg-rose-500", ring: "ring-rose-500/40" },
};

const L = {
  title: { en: "Incidents & problems", pt: "Incidentes & problemas", es: "Incidentes y problemas" },
  subtitle: { en: "Track issues and reach the person responsible.", pt: "Acompanhe problemas e fale com o responsável.", es: "Sigue problemas y contacta al responsable." },
  new: { en: "New", pt: "Novo", es: "Nuevo" },
  empty: { en: "No incidents. 🎉", pt: "Nenhum incidente. 🎉", es: "Sin incidentes. 🎉" },
  open: { en: "Open", pt: "Abertos", es: "Abiertos" },
  resolved: { en: "Resolved", pt: "Resolvidos", es: "Resueltos" },
  titleF: { en: "Title", pt: "Título", es: "Título" },
  descF: { en: "Description", pt: "Descrição", es: "Descripción" },
  severity: { en: "Severity", pt: "Severidade", es: "Severidad" },
  assignee: { en: "Responsible", pt: "Responsável", es: "Responsable" },
  pickSub: { en: "Pick a subcontractor…", pt: "Escolher subcontratado…", es: "Elegir subcontratista…" },
  manual: { en: "Or type name / email", pt: "Ou digite nome / email", es: "O escribe nombre / email" },
  name: { en: "Name", pt: "Nome", es: "Nombre" },
  email: { en: "Email", pt: "Email", es: "Email" },
  create: { en: "Open incident", pt: "Abrir incidente", es: "Abrir incidente" },
  emailBtn: { en: "Email responsible", pt: "Enviar email ao responsável", es: "Enviar email al responsable" },
  message: { en: "Message", pt: "Mensagem", es: "Mensaje" },
  markResolved: { en: "Mark resolved", pt: "Marcar resolvido", es: "Marcar resuelto" },
  reopen: { en: "Reopen", pt: "Reabrir", es: "Reabrir" },
  back: { en: "Back to home", pt: "Voltar ao início", es: "Volver al inicio" },
  noEmail: { en: "No email for this responsible.", pt: "Sem email para este responsável.", es: "Sin email para este responsable." },
} as const;

export function IncidentsView({
  rows,
  subs,
}: {
  rows: Incident[];
  subs: Subcontractor[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Incident | null>(null);

  const open = rows.filter((r) => r.status === "open");
  const resolved = rows.filter((r) => r.status === "resolved");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold">{tr(L.title)}</h1>
          <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
        </div>
        <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> {tr(L.new)}
        </Button>
      </header>

      {rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      )}

      {open.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.open)}</p>
          {open.map((r) => (
            <Row key={r.id} r={r} tr={tr} onOpen={() => setDetail(r)} />
          ))}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="space-y-2 opacity-70">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.resolved)}</p>
          {resolved.map((r) => (
            <Row key={r.id} r={r} tr={tr} onOpen={() => setDetail(r)} />
          ))}
        </section>
      )}

      <Link
        href="/home"
        className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium shadow-xs hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>

      <CreateDialog
        open={adding}
        subs={subs}
        tr={tr}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          router.refresh();
        }}
      />

      <DetailDialog
        incident={detail}
        tr={tr}
        onClose={() => setDetail(null)}
        onChanged={() => {
          setDetail(null);
          router.refresh();
        }}
        startTransition={startTransition}
      />
    </main>
  );
}

function Row({ r, tr, onOpen }: { r: Incident; tr: (m: Record<Lang, string>) => string; onOpen: () => void }) {
  const sev = SEV[r.severity];
  return (
    <button
      onClick={onOpen}
      className={cn("flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-xs ring-1", sev.ring)}
    >
      <span className={cn("h-3 w-3 shrink-0 rounded-full", sev.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {tr(sev.label)}
          {r.assignee_name ? ` · ${r.assignee_name}` : ""}
          {r.estimates?.title ? ` · ${r.estimates.title}` : ""}
        </p>
      </div>
      {r.status === "resolved" && <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />}
    </button>
  );
}

function CreateDialog({
  open,
  subs,
  tr,
  onClose,
  onSaved,
}: {
  open: boolean;
  subs: Subcontractor[];
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Sev>("yellow");
  const [subId, setSubId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setSeverity("yellow");
    setSubId("");
    setName("");
    setEmail("");
  }

  function submit() {
    const sub = subs.find((s) => s.id === subId);
    startTransition(async () => {
      await createIncident({
        title,
        description,
        severity,
        assignee_sub_id: subId || null,
        assignee_name: sub?.name ?? name ?? null,
        assignee_email: sub?.email ?? email ?? null,
      });
      reset();
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr(L.create)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{tr(L.titleF)}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label>{tr(L.severity)}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["green", "yellow", "red"] as Sev[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium",
                    severity === s ? "border-foreground/30 bg-muted" : "border-border text-muted-foreground"
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", SEV[s].dot)} /> {tr(SEV[s].label)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{tr(L.descF)}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label>{tr(L.assignee)}</Label>
            {subs.length > 0 && (
              <Select value={subId || "__none__"} onValueChange={(v) => setSubId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={tr(L.pickSub)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.trade ? ` · ${s.trade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!subId && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={tr(L.name)} value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder={tr(L.email)} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" disabled={pending || !title.trim()} onClick={submit}>
            {tr(L.create)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  incident,
  tr,
  onClose,
  onChanged,
  startTransition,
}: {
  incident: Incident | null;
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onChanged: () => void;
  startTransition: (cb: () => void) => void;
}) {
  const [msg, setMsg] = useState("");
  if (!incident) return null;
  const sev = SEV[incident.severity];

  function emailResponsible() {
    if (!incident) return;
    if (!incident.assignee_email) {
      toast.error(tr(L.noEmail));
      return;
    }
    const subject = `[${tr(sev.label)}] ${incident.title}`;
    const body = `${incident.description ? incident.description + "\n\n" : ""}${msg}`;
    window.location.href = `mailto:${incident.assignee_email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <Dialog open={incident !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", sev.dot)} /> {incident.title}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          {incident.description && <p className="text-muted-foreground">{incident.description}</p>}

          {/* responsible */}
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tr(L.assignee)}
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <User className="h-4 w-4" /> {incident.assignee_name ?? "—"}
            </p>
            {incident.assignee_email && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {incident.assignee_email}
              </p>
            )}
          </div>

          {/* message → email */}
          <div className="grid gap-1.5">
            <Label>{tr(L.message)}</Label>
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />
          </div>
          <Button variant="outline" onClick={emailResponsible} disabled={!incident.assignee_email}>
            <Mail className="mr-1 h-4 w-4" /> {tr(L.emailBtn)}
          </Button>

          <div className="flex gap-2">
            {incident.status === "open" ? (
              <Button
                className="flex-1"
                onClick={() => startTransition(async () => { await resolveIncident(incident.id); onChanged(); })}
              >
                <CircleCheck className="mr-1 h-4 w-4" /> {tr(L.markResolved)}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => startTransition(async () => { await reopenIncident(incident.id); onChanged(); })}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> {tr(L.reopen)}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground"
              aria-label="delete"
              onClick={() => startTransition(async () => { await deleteIncident(incident.id); onChanged(); })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
