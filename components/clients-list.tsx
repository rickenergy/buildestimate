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
import { upsertClient, updateClientStatus } from "@/app/actions/clients";
import { Plus, Phone, ChevronRight, AlertCircle } from "lucide-react";
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
  const [adding, setAdding] = useState(false);

  const daysStale = (c: ClientRow) =>
    Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between animate-fade-up">
        <h1 className="text-xl font-bold">{t.clients.title}</h1>
        <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> {t.clients.add}
        </Button>
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
                      onClick={() => setEditing(c)}
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
    </section>
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
