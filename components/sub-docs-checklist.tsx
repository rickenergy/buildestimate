"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { upsertSubDoc, deleteSubDoc, getSubDocUrl, type SubDoc, type SubDocType } from "@/app/actions/subdocs";
import { uploadSubDoc } from "@/lib/upload-client";
import { FileCheck2, Check, X, TriangleAlert, Paperclip, FileText, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const DOC_META: { type: SubDocType; required: boolean; label: Record<Lang, string>; hint: Record<Lang, string>; hasExpiry?: boolean }[] = [
  {
    type: "w9",
    required: true,
    label: { en: "W-9", pt: "W-9", es: "W-9" },
    hint: { en: "Tax ID for the year-end 1099", pt: "Tax ID para o 1099 do fim do ano", es: "Tax ID para el 1099 de fin de año" },
  },
  {
    type: "coi",
    required: true,
    hasExpiry: true,
    label: { en: "COI (insurance)", pt: "COI (seguro)", es: "COI (seguro)" },
    hint: {
      en: "Liability + Workers' Comp, you as additional insured",
      pt: "Liability + Workers' Comp, sua empresa como additional insured",
      es: "Liability + Workers' Comp, tú como asegurado adicional",
    },
  },
  {
    type: "license",
    required: false,
    hasExpiry: true,
    label: { en: "Trade license", pt: "Licença do trade", es: "Licencia del oficio" },
    hint: { en: "When the state requires it", pt: "Quando o estado exige", es: "Cuando el estado la exige" },
  },
  {
    type: "agreement",
    required: true,
    label: { en: "Subcontractor agreement", pt: "Contrato de subcontratação", es: "Contrato de subcontratación" },
    hint: { en: "Scope, price, schedule, retainage, disputes", pt: "Escopo, valor, prazo, retenção, disputas", es: "Alcance, precio, plazo, retención, disputas" },
  },
  {
    type: "lien_waiver",
    required: false,
    label: { en: "Lien waiver", pt: "Lien waiver", es: "Lien waiver" },
    hint: { en: "Collected at each payment", pt: "Coletado a cada pagamento", es: "Se recoge en cada pago" },
  },
  {
    type: "sov",
    required: false,
    label: { en: "Schedule of values", pt: "Cronograma de pagamento", es: "Cronograma de pagos" },
    hint: { en: "Payment per stage (%)", pt: "Pagamento por etapa (%)", es: "Pago por etapa (%)" },
  },
];

const L = {
  title: { en: "Hiring compliance", pt: "Documentação de contratação", es: "Documentación de contratación" },
  subtitle: {
    en: "What US companies collect before a sub steps on site.",
    pt: "O que empresas nos EUA coletam antes do sub pisar na obra.",
    es: "Lo que las empresas en EE.UU. reúnen antes de que el sub entre a obra.",
  },
  required: { en: "required", pt: "obrigatório", es: "obligatorio" },
  expires: { en: "Expires", pt: "Vence", es: "Vence" },
  expired: { en: "Expired", pt: "Vencido", es: "Vencido" },
  ready: { en: "Ready to hire", pt: "Pronto para contratar", es: "Listo para contratar" },
  missing: { en: "missing required docs", pt: "docs obrigatórios faltando", es: "docs obligatorios faltantes" },
  attach: { en: "Attach file", pt: "Anexar arquivo", es: "Adjuntar archivo" },
  view: { en: "View file", pt: "Ver arquivo", es: "Ver archivo" },
  uploaded: { en: "Uploaded — marked received.", pt: "Enviado — marcado como recebido.", es: "Subido — marcado como recibido." },
  uploadFail: { en: "Upload failed.", pt: "Falha no upload.", es: "Falló la subida." },
} as const;

export function SubDocsChecklist({
  subcontractorId,
  docs,
}: {
  subcontractorId: string;
  docs: SubDoc[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expiryDraft, setExpiryDraft] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const byType = new Map(docs.map((d) => [d.doc_type, d]));
  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpired = (d?: SubDoc) => !!d?.expires && d.expires < todayIso;

  const requiredMissing = DOC_META.filter(
    (m) => m.required && (!byType.get(m.type) || isExpired(byType.get(m.type)))
  ).length;

  function toggle(meta: (typeof DOC_META)[number]) {
    const existing = byType.get(meta.type);
    startTransition(async () => {
      if (existing) {
        await deleteSubDoc(subcontractorId, meta.type);
      } else {
        await upsertSubDoc({
          subcontractorId,
          docType: meta.type,
          expires: meta.hasExpiry ? expiryDraft[meta.type] || null : null,
        });
      }
      router.refresh();
    });
  }

  function setExpiry(meta: (typeof DOC_META)[number], value: string) {
    setExpiryDraft((d) => ({ ...d, [meta.type]: value }));
    const existing = byType.get(meta.type);
    if (existing) {
      startTransition(async () => {
        await upsertSubDoc({ subcontractorId, docType: meta.type, expires: value || null });
        router.refresh();
      });
    }
  }

  async function onFile(meta: (typeof DOC_META)[number], file: File | undefined) {
    if (!file) return;
    setUploading(meta.type);
    try {
      const path = await uploadSubDoc(subcontractorId, meta.type, file);
      await upsertSubDoc({
        subcontractorId,
        docType: meta.type,
        expires: byType.get(meta.type)?.expires ?? (meta.hasExpiry ? expiryDraft[meta.type] || null : null),
        filePath: path,
      });
      router.refresh();
      toast.success(tr(L.uploaded));
    } catch {
      toast.error(tr(L.uploadFail));
    } finally {
      setUploading(null);
    }
  }

  async function openFile(path: string) {
    const url = await getSubDocUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(tr(L.uploadFail));
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-4 w-4 text-primary" /> {tr(L.title)}
          </CardTitle>
          {requiredMissing === 0 ? (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ {tr(L.ready)}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {requiredMissing} {tr(L.missing)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {DOC_META.map((meta) => {
          const doc = byType.get(meta.type);
          const expired = isExpired(doc);
          return (
            <div
              key={meta.type}
              className={
                "flex flex-col gap-1.5 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:gap-2.5 " +
                (doc && !expired ? "border-emerald-500/30 bg-emerald-500/5" : expired ? "border-rose-500/40 bg-rose-500/5" : "")
              }
            >
              <Button
                size="icon"
                variant={doc ? "default" : "outline"}
                className={"h-7 w-7 shrink-0 " + (doc ? "bg-emerald-500 hover:bg-emerald-600" : "")}
                disabled={pending}
                onClick={() => toggle(meta)}
                aria-label={meta.label[lang]}
              >
                {doc ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5 opacity-40" />}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {meta.label[lang]}
                  {meta.required && (
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[9px] uppercase text-muted-foreground">
                      {tr(L.required)}
                    </span>
                  )}
                  {expired && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1 py-0.5 text-[9px] font-semibold uppercase text-rose-600">
                      <TriangleAlert className="h-2.5 w-2.5" /> {tr(L.expired)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{meta.hint[lang]}</p>
              </div>
              {meta.hasExpiry && (
                <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  {tr(L.expires)}
                  <Input
                    type="date"
                    value={doc?.expires ?? expiryDraft[meta.type] ?? ""}
                    onChange={(e) => setExpiry(meta, e.target.value)}
                    className="h-8 w-[9.5rem] text-xs"
                  />
                </label>
              )}

              {/* File upload / view (PDF or image) */}
              <div className="flex shrink-0 items-center gap-1">
                <input
                  ref={(el) => {
                    fileRefs.current[meta.type] = el;
                  }}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => onFile(meta, e.target.files?.[0])}
                />
                {doc?.file_path && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary"
                    aria-label={tr(L.view)}
                    onClick={() => openFile(doc.file_path!)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={uploading === meta.type}
                  aria-label={tr(L.attach)}
                  onClick={() => fileRefs.current[meta.type]?.click()}
                >
                  {uploading === meta.type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
