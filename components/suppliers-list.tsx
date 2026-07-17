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
import { upsertSupplier, deleteSupplier } from "@/app/actions/network";
import { Truck, Phone, Mail, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Supplier } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Suppliers", pt: "Fornecedores", es: "Proveedores" },
  subtitle: {
    en: "Where you buy materials & rent equipment.",
    pt: "Onde você compra material e aluga equipamento.",
    es: "Dónde compras materiales y alquilas equipo.",
  },
  add: { en: "Add", pt: "Adicionar", es: "Agregar" },
  empty: { en: "No suppliers yet.", pt: "Nenhum fornecedor ainda.", es: "Aún no hay proveedores." },
  name: { en: "Name", pt: "Nome", es: "Nombre" },
  category: { en: "Category", pt: "Categoria", es: "Categoría" },
  contact: { en: "Contact", pt: "Contato", es: "Contacto" },
  email: { en: "Email", pt: "Email", es: "Email" },
  phone: { en: "Phone", pt: "Telefone", es: "Teléfono" },
  address: { en: "Address", pt: "Endereço", es: "Dirección" },
  account: { en: "Account #", pt: "Nº da conta", es: "Nº de cuenta" },
  notes: { en: "Notes", pt: "Notas", es: "Notas" },
  save: { en: "Save", pt: "Salvar", es: "Guardar" },
  edit: { en: "Edit", pt: "Editar", es: "Editar" },
  back: { en: "Back to settings", pt: "Voltar às configurações", es: "Volver a ajustes" },
} as const;

export function SuppliersList({ rows }: { rows: Supplier[] }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [adding, setAdding] = useState(false);

  function remove(id: string) {
    startTransition(async () => {
      await deleteSupplier(id);
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
        <Button size="sm" className="press rounded-full shadow-sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> {tr(L.add)}
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((s, i) => (
            <Card key={s.id} className="animate-fade-up" style={{ ["--i" as string]: Math.min(i, 8) }}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Truck className="h-5 w-5" />
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(s)}>
                  <p className="truncate font-medium">
                    {s.name}
                    {s.category ? <span className="text-muted-foreground"> · {s.category}</span> : ""}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
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
                  </p>
                </button>
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

      <SupDialog
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

function SupDialog({
  open,
  initial,
  tr,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Supplier;
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    category: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    account_number: "",
    notes: "",
  });
  const [key, setKey] = useState("");

  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      category: initial?.category ?? "",
      contact_name: initial?.contact_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      account_number: initial?.account_number ?? "",
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
            <Field label={tr(L.category)}>
              <Input value={form.category} onChange={set("category")} />
            </Field>
            <Field label={tr(L.contact)}>
              <Input value={form.contact_name} onChange={set("contact_name")} />
            </Field>
          </div>
          <Field label={tr(L.phone)}>
            <Input value={form.phone} onChange={set("phone")} type="tel" />
          </Field>
          <Field label={tr(L.email)}>
            <Input value={form.email} onChange={set("email")} type="email" />
          </Field>
          <Field label={tr(L.address)}>
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label={tr(L.account)}>
            <Input value={form.account_number} onChange={set("account_number")} />
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
                await upsertSupplier({ id: initial?.id, ...form });
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
