"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/providers";
import { addTransaction } from "@/app/actions/finance";
import { uploadAttachment } from "@/lib/upload-client";
import {
  DISPOSITIONS,
  PURCHASE_TYPES,
  PURCHASE_UNITS,
  type Disposition,
  type PurchaseType,
  type TransactionKind,
} from "@/lib/finance";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Camera,
  ClipboardList,
  FileText,
  Hammer,
  Loader2,
  Package,
  Recycle,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Lang = "en" | "pt" | "es";
type Intent = "expense" | "income" | "change_order";

// Self-contained trilingual copy (avoids touching the i18n Dict type).
const L = {
  title: { en: "New entry", pt: "Novo lançamento", es: "Nuevo registro" },
  q1: { en: "What are you registering?", pt: "O que você quer registrar?", es: "¿Qué vas a registrar?" },
  expense: { en: "Expense / outflow", pt: "Gasto / saída", es: "Gasto / salida" },
  income: { en: "Payment in", pt: "Entrada", es: "Entrada" },
  changeOrder: { en: "Change order", pt: "Change order", es: "Orden de cambio" },
  q2: { en: "Type of purchase", pt: "Tipo de compra", es: "Tipo de compra" },
  amount: { en: "Amount", pt: "Valor", es: "Monto" },
  vendor: { en: "Supplier / vendor", pt: "Fornecedor", es: "Proveedor" },
  qty: { en: "Quantity", pt: "Quantidade", es: "Cantidad" },
  unit: { en: "Unit", pt: "Unidade", es: "Unidad" },
  date: { en: "Date", pt: "Data", es: "Fecha" },
  job: { en: "Linked job", pt: "Trabalho vinculado", es: "Trabajo vinculado" },
  noJob: { en: "No job", pt: "Sem trabalho", es: "Sin trabajo" },
  desc: { en: "Description", pt: "Descrição", es: "Descripción" },
  disposition: { en: "Disposition / status", pt: "Destino / condição", es: "Destino / condición" },
  wasteValue: { en: "Value lost", pt: "Valor perdido", es: "Valor perdido" },
  reusedIn: { en: "Reused in job", pt: "Reaproveitado no trabalho", es: "Reutilizado en" },
  photo: { en: "Product / equipment photo", pt: "Foto do produto / equipamento", es: "Foto del producto" },
  invoice: { en: "Invoice (nota fiscal)", pt: "Nota fiscal", es: "Factura (nota fiscal)" },
  invoiceReq: { en: "Always attach the invoice", pt: "Sempre anexe a nota fiscal", es: "Adjunta siempre la factura" },
  addPhoto: { en: "Add photo", pt: "Adicionar foto", es: "Agregar foto" },
  addInvoice: { en: "Attach invoice", pt: "Anexar nota", es: "Adjuntar factura" },
  camera: { en: "Camera", pt: "Câmera", es: "Cámara" },
  save: { en: "Save entry", pt: "Salvar lançamento", es: "Guardar" },
  saving: { en: "Saving…", pt: "Salvando…", es: "Guardando…" },
  back: { en: "Back", pt: "Voltar", es: "Atrás" },
  invalidAmount: { en: "Enter a valid amount", pt: "Informe um valor válido", es: "Ingresa un monto válido" },
  saved: { en: "Entry saved", pt: "Lançamento salvo", es: "Registro guardado" },
  error: { en: "Something went wrong", pt: "Algo deu errado", es: "Algo salió mal" },
  optional: { en: "optional", pt: "opcional", es: "opcional" },
} as const;

const PURCHASE_LABEL: Record<PurchaseType, Record<Lang, string>> = {
  material: { en: "Material", pt: "Material", es: "Material" },
  service: { en: "Service", pt: "Serviço", es: "Servicio" },
  equipment: { en: "Equipment", pt: "Equipamento", es: "Equipo" },
  labor: { en: "Labor", pt: "Mão de obra", es: "Mano de obra" },
  other: { en: "Other", pt: "Outro", es: "Otro" },
};

const PURCHASE_ICON: Record<PurchaseType, React.ElementType> = {
  material: Package,
  service: Wrench,
  equipment: Truck,
  labor: Hammer,
  other: FileText,
};

const DISPOSITION_LABEL: Record<Disposition, Record<Lang, string>> = {
  used: { en: "Used on job", pt: "Usado na obra", es: "Usado en obra" },
  wasted: { en: "Wasted", pt: "Desperdício", es: "Desperdicio" },
  returned: { en: "Returned", pt: "Devolvido", es: "Devuelto" },
  reused: { en: "Reused elsewhere", pt: "Reaproveitado", es: "Reutilizado" },
  broken: { en: "Broken", pt: "Quebrado", es: "Roto" },
  lost: { en: "Lost", pt: "Perdido", es: "Perdido" },
};

// Purchase type → default expense category (job_transactions.category is NOT NULL).
const TYPE_CATEGORY: Record<PurchaseType, string> = {
  material: "materials",
  service: "labor",
  equipment: "equipment",
  labor: "labor",
  other: "other",
};

export function TransactionCadastro({
  open,
  onClose,
  estimates,
}: {
  open: boolean;
  onClose: () => void;
  estimates: { id: string; title: string }[];
}) {
  const lang = useLang() as Lang;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [intent, setIntent] = useState<Intent | null>(null);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("material");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("un");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [estimateId, setEstimateId] = useState("");
  const [description, setDescription] = useState("");
  const [disposition, setDisposition] = useState<Disposition>("used");
  const [wasteValue, setWasteValue] = useState("");
  const [reusedEstimateId, setReusedEstimateId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const invoiceInput = useRef<HTMLInputElement>(null);

  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;

  function reset() {
    setIntent(null);
    setPurchaseType("material");
    setAmount("");
    setVendor("");
    setQuantity("");
    setUnit("un");
    setEstimateId("");
    setDescription("");
    setDisposition("used");
    setWasteValue("");
    setReusedEstimateId("");
    setPhotoFile(null);
    setInvoiceFile(null);
  }

  function close() {
    reset();
    onClose();
  }

  const showDisposition =
    intent === "expense" && (purchaseType === "material" || purchaseType === "equipment");
  const isLoss = disposition === "wasted" || disposition === "broken" || disposition === "lost";

  async function submit() {
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error(tr(L.invalidAmount));
      return;
    }
    setUploading(true);
    try {
      const photo_path = photoFile ? await uploadAttachment("photo", photoFile) : null;
      const invoice_path = invoiceFile ? await uploadAttachment("invoice", invoiceFile) : null;
      setUploading(false);

      const kind: TransactionKind = intent === "income" || intent === "change_order" ? "income" : "expense";
      const category =
        intent === "change_order"
          ? "change_order"
          : intent === "income"
            ? "deposit"
            : TYPE_CATEGORY[purchaseType];

      await new Promise<void>((resolve, reject) =>
        startTransition(async () => {
          try {
            await addTransaction({
              kind,
              category,
              amount: value,
              description: description || undefined,
              occurred_at: date,
              estimate_id: estimateId || null,
              purchase_type: intent === "expense" ? purchaseType : null,
              vendor: vendor || null,
              quantity: quantity ? Number(quantity) : null,
              unit: quantity ? unit : null,
              photo_path,
              invoice_path,
              disposition: showDisposition ? disposition : null,
              waste_value: showDisposition && isLoss && wasteValue ? Number(wasteValue) : null,
              reused_estimate_id: showDisposition && disposition === "reused" ? reusedEstimateId || null : null,
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        })
      );
      toast.success(tr(L.saved));
      router.refresh();
      close();
    } catch {
      setUploading(false);
      toast.error(tr(L.error));
    }
  }

  const busy = pending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr(L.title)}</DialogTitle>
        </DialogHeader>

        {/* Step 1 — intent */}
        {!intent ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">{tr(L.q1)}</p>
            <IntentButton
              icon={<ArrowDownCircle className="h-5 w-5 text-rose-500" />}
              label={tr(L.expense)}
              onClick={() => setIntent("expense")}
            />
            <IntentButton
              icon={<ArrowUpCircle className="h-5 w-5 text-emerald-500" />}
              label={tr(L.income)}
              onClick={() => setIntent("income")}
            />
            <IntentButton
              icon={<ClipboardList className="h-5 w-5 text-primary" />}
              label={tr(L.changeOrder)}
              onClick={() => setIntent("change_order")}
            />
          </div>
        ) : (
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setIntent(null)}
              className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← {tr(L.back)}
            </button>

            {/* Step 2 — purchase type (expense only) */}
            {intent === "expense" && (
              <div className="grid gap-1.5">
                <Label>{tr(L.q2)}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PURCHASE_TYPES.map((pt) => {
                    const Icon = PURCHASE_ICON[pt];
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setPurchaseType(pt)}
                        className={cn(
                          "press flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium",
                          purchaseType === pt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {tr(PURCHASE_LABEL[pt])}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* amount + vendor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{tr(L.amount)}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{tr(L.date)}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {intent === "expense" && (
              <div className="grid gap-1.5">
                <Label>{tr(L.vendor)}</Label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
            )}

            {/* quantity + unit (material/equipment) */}
            {intent === "expense" && purchaseType !== "labor" && purchaseType !== "service" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{tr(L.qty)}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{tr(L.unit)}</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* linked job */}
            <div className="grid gap-1.5">
              <Label>{tr(L.job)}</Label>
              <Select
                value={estimateId || "__none__"}
                onValueChange={(v) => setEstimateId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tr(L.noJob)}</SelectItem>
                  {estimates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* disposition + waste (material/equipment) */}
            {showDisposition && (
              <div className="grid gap-1.5">
                <Label>{tr(L.disposition)}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DISPOSITIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDisposition(d)}
                      className={cn(
                        "press rounded-lg border px-2 py-1.5 text-[11px] font-medium",
                        disposition === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {tr(DISPOSITION_LABEL[d])}
                    </button>
                  ))}
                </div>
                {isLoss && (
                  <div className="mt-1 grid gap-1.5">
                    <Label className="text-rose-600">{tr(L.wasteValue)}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={wasteValue}
                      onChange={(e) => setWasteValue(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}
                {disposition === "reused" && (
                  <div className="mt-1 grid gap-1.5">
                    <Label className="flex items-center gap-1 text-emerald-600">
                      <Recycle className="h-3.5 w-3.5" /> {tr(L.reusedIn)}
                    </Label>
                    <Select
                      value={reusedEstimateId || "__none__"}
                      onValueChange={(v) => setReusedEstimateId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{tr(L.noJob)}</SelectItem>
                        {estimates.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* description */}
            <div className="grid gap-1.5">
              <Label>
                {tr(L.desc)}{" "}
                <span className="text-xs font-normal text-muted-foreground">({tr(L.optional)})</span>
              </Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            {/* photo (expense) */}
            {intent === "expense" && (
              <AttachmentField
                label={tr(L.photo)}
                file={photoFile}
                accept="image/*"
                onClear={() => setPhotoFile(null)}
                inputRef={photoInput}
                cameraRef={cameraInput}
                addLabel={tr(L.addPhoto)}
                cameraLabel={tr(L.camera)}
                onFile={setPhotoFile}
              />
            )}

            {/* nota fiscal — always */}
            <AttachmentField
              label={tr(L.invoice)}
              hint={tr(L.invoiceReq)}
              file={invoiceFile}
              accept="image/*,application/pdf"
              onClear={() => setInvoiceFile(null)}
              inputRef={invoiceInput}
              addLabel={tr(L.addInvoice)}
              onFile={setInvoiceFile}
            />

            <Button onClick={submit} disabled={busy} className="mt-1">
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {tr(L.saving)}
                </>
              ) : (
                tr(L.save)
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntentButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs hover:shadow-sm"
    >
      {icon}
      <span className="font-semibold">{label}</span>
      <span className="ml-auto text-muted-foreground">→</span>
    </button>
  );
}

function AttachmentField({
  label,
  hint,
  file,
  accept,
  onClear,
  inputRef,
  cameraRef,
  addLabel,
  cameraLabel,
  onFile,
}: {
  label: string;
  hint?: string;
  file: File | null;
  accept: string;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  cameraRef?: React.RefObject<HTMLInputElement | null>;
  addLabel: string;
  cameraLabel?: string;
  onFile: (f: File) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {hint && <p className="-mt-1 text-xs text-amber-600">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {cameraRef && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      )}
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={onClear} aria-label="remove" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {cameraRef && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> {cameraLabel}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => inputRef.current?.click()}
          >
            <FileText className="h-4 w-4" /> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
