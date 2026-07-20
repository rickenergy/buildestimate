"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { createSubContract, voidSubContract, type SubContractRow } from "@/app/actions/sub-contracts";
import { FileSignature, Plus, Copy, Check, Ban, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Contracts", pt: "Contratos", es: "Contratos" },
  subtitle: {
    en: "Generate a signable agreement and send the link.",
    pt: "Gere um contrato assinável e envie o link.",
    es: "Genera un contrato firmable y envía el enlace.",
  },
  new: { en: "New contract", pt: "Novo contrato", es: "Nuevo contrato" },
  job: { en: "Job / project title", pt: "Título do trabalho", es: "Título del trabajo" },
  scope: { en: "Scope of work", pt: "Escopo do trabalho", es: "Alcance del trabajo" },
  amount: { en: "Amount (USD)", pt: "Valor (USD)", es: "Monto (USD)" },
  payment: { en: "Payment terms (optional)", pt: "Condições de pagamento (opcional)", es: "Condiciones de pago (opcional)" },
  paymentPh: {
    en: "e.g. 50% start, 50% completion",
    pt: "ex.: 50% no início, 50% na entrega",
    es: "ej.: 50% al inicio, 50% al terminar",
  },
  retainage: { en: "Retainage %", pt: "Retenção %", es: "Retención %" },
  start: { en: "Start", pt: "Início", es: "Inicio" },
  end: { en: "End", pt: "Fim", es: "Fin" },
  create: { en: "Generate contract", pt: "Gerar contrato", es: "Generar contrato" },
  copy: { en: "Copy link", pt: "Copiar link", es: "Copiar enlace" },
  share: {
    en: "Send this link — they read and sign on their phone.",
    pt: "Envie este link — ele lê e assina pelo celular.",
    es: "Envía este enlace — lee y firma desde el teléfono.",
  },
  empty: { en: "No contracts yet.", pt: "Nenhum contrato ainda.", es: "Sin contratos aún." },
  st: {
    sent: { en: "Awaiting signature", pt: "Aguardando assinatura", es: "Esperando firma" },
    signed: { en: "Signed", pt: "Assinado", es: "Firmado" },
    declined: { en: "Declined", pt: "Recusado", es: "Rechazado" },
    void: { en: "Void", pt: "Cancelado", es: "Anulado" },
  },
  legal: {
    en: "Template for convenience — review with an attorney.",
    pt: "Modelo por conveniência — revise com um advogado.",
    es: "Plantilla por conveniencia — revísala con un abogado.",
  },
} as const;

export function SubContractsCard({
  subcontractorId,
  contracts,
  baseUrl,
}: {
  subcontractorId: string;
  contracts: SubContractRow[];
  baseUrl: string;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    jobTitle: "",
    scope: "",
    amount: "",
    paymentTerms: "",
    retainagePct: "0",
    startDate: "",
    endDate: "",
  });

  const linkFor = (token: string) => `${baseUrl}/c/${token}`;

  async function copy(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  function create() {
    startTransition(async () => {
      const res = await createSubContract({
        subcontractorId,
        jobTitle: form.jobTitle,
        scope: form.scope,
        amount: Number(form.amount) || 0,
        paymentTerms: form.paymentTerms,
        retainagePct: Number(form.retainagePct) || 0,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      if (res.ok && res.token) {
        setOpen(false);
        setForm({ jobTitle: "", scope: "", amount: "", paymentTerms: "", retainagePct: "0", startDate: "", endDate: "" });
        await copy(linkFor(res.token), "new");
        toast.success(tr(L.share));
        router.refresh();
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  const STATUS_CLS: Record<string, string> = {
    sent: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    signed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    declined: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    void: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4 text-primary" /> {tr(L.title)}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> {tr(L.new)}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr(L.empty)}</p>
        ) : (
          contracts.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(Number(c.amount), lang)} · {c.created_at.slice(0, 10)}
                  {c.signed_name ? ` · ✍️ ${c.signed_name}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[c.status] ?? ""}`}>
                {tr(L.st[(c.status as keyof typeof L.st) in L.st ? (c.status as keyof typeof L.st) : "sent"])}
              </span>
              {c.status === "sent" && (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={tr(L.copy)} onClick={() => copy(linkFor(c.token), c.id)}>
                    {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    aria-label="void"
                    disabled={pending}
                    onClick={() => startTransition(async () => { await voidSubContract(c.id, subcontractorId); router.refresh(); })}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
        <p className="text-[10px] text-muted-foreground">{tr(L.legal)}</p>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr(L.new)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">{tr(L.job)}</label>
              <Input value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">{tr(L.scope)}</label>
              <Textarea rows={3} value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">{tr(L.amount)}</label>
                <Input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">{tr(L.retainage)}</label>
                <Input type="number" inputMode="decimal" value={form.retainagePct} onChange={(e) => setForm((f) => ({ ...f, retainagePct: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">{tr(L.payment)}</label>
              <Input value={form.paymentTerms} placeholder={tr(L.paymentPh)} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">{tr(L.start)}</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">{tr(L.end)}</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" disabled={pending || !form.jobTitle.trim() || !form.scope.trim() || !form.amount} onClick={create}>
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSignature className="mr-1 h-4 w-4" />}
              {tr(L.create)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
