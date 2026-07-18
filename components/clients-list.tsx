"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { upsertClient, updateClientStatus, importClients } from "@/app/actions/clients";
import { Plus, Phone, ChevronRight, AlertCircle, Download, PhoneCall, MessageCircle, Mail, MapPin, Pencil } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { CsvImport, type ImportField } from "@/components/csv-import";

const CLIENT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, aliases: ["name", "nome", "cliente", "client", "full name", "customer", "contact"] },
  { key: "phone", label: "Phone", aliases: ["phone", "telefone", "tel", "celular", "mobile", "cell", "teléfono", "whatsapp"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "correo", "mail"] },
  { key: "address", label: "Address", aliases: ["address", "endereço", "endereco", "direccion", "dirección", "location", "street"] },
  { key: "notes", label: "Notes", aliases: ["notes", "notas", "obs", "observação", "observacao", "comment", "comentario"] },
];
import type { ClientRow, ClientStatus } from "@/lib/types";

type ClientWithEstimates = ClientRow & {
  estimates: { id: string; title: string; total: number; status: string }[];
};

const STATUSES: ClientStatus[] = ["lead", "estimate_sent", "follow_up", "approved", "lost"];

export function ClientsList({ clients }: { clients: ClientWithEstimates[] }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [viewing, setViewing] = useState<ClientWithEstimates | null>(null);
  const [adding, setAdding] = useState(false);

  const daysStale = (c: ClientRow) =>
    Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between animate-fade-up">
        <h1 className="text-xl font-bold">{t.clients.title}</h1>
        <div className="flex gap-2">
          <CsvImport
            fields={CLIENT_IMPORT_FIELDS}
            onImport={(rows) => importClients(rows as { name: string }[])}
          />
          {clients.length > 0 && (
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              aria-label="export csv"
              onClick={() =>
                exportToCsv(
                  "clients",
                  clients.map(({ estimates: _estimates, ...c }) => c)
                )
              }
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t.clients.add}
          </Button>
        </div>
      </header>

      {clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t.clients.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((c, i) => {
            const stale = c.status === "follow_up" && daysStale(c) >= 3;
            return (
              <Card key={c.id} className="animate-fade-up" style={{ ["--i" as string]: Math.min(i, 8) }}>
                <CardContent className="flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setViewing(c)}
                    >
                      <p className="truncate font-medium">{c.name}</p>
                      {c.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </p>
                      )}
                    </button>
                    <Select
                      defaultValue={c.status}
                      onValueChange={(v) =>
                        startTransition(async () => {
                          await updateClientStatus(c.id, v as ClientStatus);
                          router.refresh();
                        })
                      }
                    >
                      <SelectTrigger className="w-32 text-xs" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t.clients.status[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {stale && (
                    <p className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {daysStale(c)}
                      {t.clients.daysAgo}
                    </p>
                  )}

                  {c.estimates.length > 0 && (
                    <div className="flex flex-col gap-1 border-t pt-2">
                      {c.estimates.map((e) => (
                        <Link
                          key={e.id}
                          href={`/estimate/${e.id}`}
                          className="flex items-center justify-between text-xs text-muted-foreground active:text-foreground"
                        >
                          <span className="truncate">{e.title}</span>
                          <span className="flex items-center gap-1 font-medium">
                            {formatMoney(Number(e.total), lang)}
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ClientDialog
        open={adding || editing !== null}
        initial={editing ?? undefined}
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

      <ClientDetail
        client={viewing}
        onClose={() => setViewing(null)}
        onEdit={(c) => {
          setViewing(null);
          setEditing(c);
        }}
      />
    </section>
  );
}

function ClientDetail({
  client,
  onClose,
  onEdit,
}: {
  client: ClientWithEstimates | null;
  onClose: () => void;
  onEdit: (c: ClientRow) => void;
}) {
  const t = useDict();
  const lang = useLang();
  if (!client) return null;

  const digits = client.phone?.replace(/\D/g, "") ?? "";
  const waDigits = digits.length === 10 ? `1${digits}` : digits;
  const total = client.estimates.reduce((s, e) => s + Number(e.total), 0);

  return (
    <Dialog open={client !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {/* quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn
              disabled={!digits}
              href={digits ? `tel:${digits}` : undefined}
              icon={<PhoneCall className="h-4 w-4" />}
              label={t.clients.phone}
            />
            <ActionBtn
              disabled={!waDigits}
              href={waDigits ? `https://wa.me/${waDigits}` : undefined}
              external
              icon={<MessageCircle className="h-4 w-4" />}
              label="WhatsApp"
            />
            <ActionBtn
              disabled={!client.email}
              href={client.email ? `mailto:${client.email}` : undefined}
              icon={<Mail className="h-4 w-4" />}
              label={t.clients.email}
            />
          </div>
          {client.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center gap-2 rounded-xl border p-3 text-sm hover:bg-muted"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{client.address}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}

          {/* contact rows */}
          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            {client.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {client.phone}</p>}
            {client.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {client.email}</p>}
            {client.notes && <p className="mt-1 text-xs text-muted-foreground">{client.notes}</p>}
          </div>

          {/* transaction history */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.dashboard.recentEstimates}
              </p>
              {total > 0 && <span className="text-xs font-bold">{formatMoney(total, lang)}</span>}
            </div>
            {client.estimates.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-col gap-1">
                {client.estimates.map((e) => (
                  <Link
                    key={e.id}
                    href={`/estimate/${e.id}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className="shrink-0 font-medium">{formatMoney(Number(e.total), lang)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" onClick={() => onEdit(client)}>
            <Pencil className="mr-1 h-4 w-4" /> {t.common.edit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionBtn({
  href,
  icon,
  label,
  disabled,
  external,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  external?: boolean;
}) {
  if (disabled || !href) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border p-3 text-xs text-muted-foreground opacity-40">
        {icon}
        <span className="truncate">{label}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="press flex flex-col items-center gap-1 rounded-xl border bg-primary/5 p-3 text-xs font-medium text-primary hover:bg-primary/10"
    >
      {icon}
      <span className="truncate">{label}</span>
    </a>
  );
}

function ClientDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: ClientRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useDict();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [key, setKey] = useState("");

  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? t.common.edit : t.clients.add}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t.clients.name}>
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label={t.clients.phone}>
            <Input value={form.phone} onChange={set("phone")} type="tel" />
          </Field>
          <Field label={t.clients.email}>
            <Input value={form.email} onChange={set("email")} type="email" />
          </Field>
          <Field label={t.clients.address}>
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label={t.clients.notes}>
            <Textarea value={form.notes} onChange={set("notes")} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={pending || !form.name.trim()}
            onClick={() =>
              startTransition(async () => {
                await upsertClient({ id: initial?.id, ...form });
                onSaved();
              })
            }
          >
            {t.clients.save}
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
