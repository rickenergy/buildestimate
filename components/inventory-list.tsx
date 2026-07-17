"use client";

import { useMemo, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { upsertInventoryItem, deleteInventoryItem } from "@/app/actions/network";
import { Package, Wrench, Plus, Trash2, ArrowLeft, TriangleAlert, ShoppingCart } from "lucide-react";
import type { InventoryItem } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const CATEGORIES = ["material", "tool", "machine", "equipment", "consumable"] as const;

const L = {
  title: { en: "Inventory", pt: "Estoque / Inventário", es: "Inventario" },
  subtitle: {
    en: "Stock, machines & equipment on hand.",
    pt: "Estoque, máquinas e equipamentos disponíveis.",
    es: "Stock, máquinas y equipo disponible.",
  },
  add: { en: "Add", pt: "Adicionar", es: "Agregar" },
  empty: { en: "No items yet.", pt: "Nenhum item ainda.", es: "Aún no hay artículos." },
  name: { en: "Name", pt: "Nome", es: "Nombre" },
  category: { en: "Category", pt: "Categoria", es: "Categoría" },
  qty: { en: "Quantity", pt: "Quantidade", es: "Cantidad" },
  unit: { en: "Unit", pt: "Unidade", es: "Unidad" },
  cost: { en: "Unit cost", pt: "Custo unitário", es: "Costo unitario" },
  minQty: { en: "Low-stock alert at", pt: "Alerta de estoque baixo em", es: "Alerta de stock bajo en" },
  supplier: { en: "Supplier", pt: "Fornecedor", es: "Proveedor" },
  location: { en: "Location", pt: "Local", es: "Ubicación" },
  notes: { en: "Notes", pt: "Notas", es: "Notas" },
  save: { en: "Save", pt: "Salvar", es: "Guardar" },
  edit: { en: "Edit", pt: "Editar", es: "Editar" },
  low: { en: "Low stock", pt: "Estoque baixo", es: "Stock bajo" },
  reorder: { en: "Buy", pt: "Comprar", es: "Comprar" },
  value: { en: "Total value", pt: "Valor total", es: "Valor total" },
  back: { en: "Back to settings", pt: "Voltar às configurações", es: "Volver a ajustes" },
  cat: {
    material: { en: "Material", pt: "Material", es: "Material" },
    tool: { en: "Tool", pt: "Ferramenta", es: "Herramienta" },
    machine: { en: "Machine", pt: "Máquina", es: "Máquina" },
    equipment: { en: "Equipment", pt: "Equipamento", es: "Equipo" },
    consumable: { en: "Consumable", pt: "Consumível", es: "Consumible" },
  },
} as const;

export function InventoryList({ rows }: { rows: InventoryItem[] }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adding, setAdding] = useState(false);

  const totalValue = useMemo(
    () => rows.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_cost ?? 0), 0),
    [rows]
  );

  function remove(id: string) {
    startTransition(async () => {
      await deleteInventoryItem(id);
      router.refresh();
    });
  }

  const isLow = (r: InventoryItem) =>
    r.min_quantity != null && Number(r.quantity) <= Number(r.min_quantity);
  // Restock target = 2× the minimum; recommend buying the gap.
  const reorderQty = (r: InventoryItem) =>
    r.min_quantity != null ? Math.max(0, Math.round(Number(r.min_quantity) * 2 - Number(r.quantity))) : 0;

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

      {rows.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">{tr(L.value)}</span>
          <span className="font-bold">{formatMoney(totalValue, lang)}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <Card key={r.id} className="animate-fade-up" style={{ ["--i" as string]: Math.min(i, 8) }}>
              <CardContent className="flex items-center gap-3 p-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    r.is_equipment ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-primary/10 text-primary"
                  }`}
                >
                  {r.is_equipment ? <Wrench className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(r)}>
                  <p className="truncate font-medium">
                    {r.name}
                    {r.category ? (
                      <span className="text-muted-foreground"> · {tr(L.cat[r.category as keyof typeof L.cat] ?? L.cat.material)}</span>
                    ) : ""}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {Number(r.quantity)}
                      {r.unit ? ` ${r.unit}` : ""}
                    </span>
                    {r.unit_cost != null && <span>· {formatMoney(Number(r.unit_cost), lang)}</span>}
                    {isLow(r) && (
                      <span className="flex items-center gap-0.5 rounded bg-rose-500/15 px-1 py-0.5 text-[10px] font-semibold text-rose-600">
                        <TriangleAlert className="h-3 w-3" /> {tr(L.low)}
                      </span>
                    )}
                  </p>
                  {isLow(r) && reorderQty(r) > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                      <ShoppingCart className="h-3 w-3" />
                      {tr(L.reorder)} ~{reorderQty(r)} {r.unit ?? ""}
                      {r.supplier ? ` · ${r.supplier}` : ""}
                    </p>
                  )}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="delete"
                  onClick={() => remove(r.id)}
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

      <ItemDialog
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

function ItemDialog({
  open,
  initial,
  tr,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: InventoryItem;
  tr: (m: Record<Lang, string>) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    category: "material",
    quantity: "0",
    unit: "",
    unit_cost: "",
    min_quantity: "",
    is_equipment: false,
    supplier: "",
    location: "",
    notes: "",
  });
  const [key, setKey] = useState("");

  const itemKey = initial?.id ?? (open ? "new" : "");
  if (itemKey !== key) {
    setKey(itemKey);
    setForm({
      name: initial?.name ?? "",
      category: initial?.category ?? "material",
      quantity: String(initial?.quantity ?? 0),
      unit: initial?.unit ?? "",
      unit_cost: initial?.unit_cost != null ? String(initial.unit_cost) : "",
      min_quantity: initial?.min_quantity != null ? String(initial.min_quantity) : "",
      is_equipment: initial?.is_equipment ?? false,
      supplier: initial?.supplier ?? "",
      location: initial?.location ?? "",
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
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    category: v,
                    is_equipment: v === "machine" || v === "tool" || v === "equipment",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tr(L.cat[c])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={tr(L.unit)}>
              <Input value={form.unit} onChange={set("unit")} placeholder="un, sqft, box…" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={tr(L.qty)}>
              <Input type="number" inputMode="decimal" value={form.quantity} onChange={set("quantity")} />
            </Field>
            <Field label={tr(L.cost)}>
              <Input type="number" inputMode="decimal" value={form.unit_cost} onChange={set("unit_cost")} />
            </Field>
            <Field label={tr(L.minQty)}>
              <Input type="number" inputMode="decimal" value={form.min_quantity} onChange={set("min_quantity")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr(L.supplier)}>
              <Input value={form.supplier} onChange={set("supplier")} />
            </Field>
            <Field label={tr(L.location)}>
              <Input value={form.location} onChange={set("location")} />
            </Field>
          </div>
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
                await upsertInventoryItem({
                  id: initial?.id,
                  name: form.name,
                  category: form.category,
                  quantity: Number(form.quantity) || 0,
                  unit: form.unit,
                  unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
                  min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
                  is_equipment: form.is_equipment,
                  supplier: form.supplier,
                  location: form.location,
                  notes: form.notes,
                });
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
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
