"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLang } from "@/components/providers";
import { publicBaseUrl } from "@/lib/site-url";
import { shareWithSubs, deleteShare, type ShareRow } from "@/app/actions/shares";
import {
  HardHat,
  Plus,
  Copy,
  MessageCircle,
  Check,
  X,
  Clock,
  Trash2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subcontractor } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Share with subcontractors", pt: "Compartilhar com subcontratados", es: "Compartir con subcontratistas" },
  intro: {
    en: "Send this job to your crew — they reply Yes or No.",
    pt: "Mande este trabalho pra sua rede — respondem Sim ou Não.",
    es: "Envía este trabajo a tu red — responden Sí o No.",
  },
  pick: { en: "Send to…", pt: "Enviar para…", es: "Enviar a…" },
  none: { en: "No subcontractors yet. Add them in Settings.", pt: "Nenhum subcontratado. Adicione em Configurações.", es: "Sin subcontratistas. Agrégalos en Ajustes." },
  message: { en: "Message (optional)", pt: "Mensagem (opcional)", es: "Mensaje (opcional)" },
  messagePh: {
    en: "e.g. Framing job, $X, start next week. Interested?",
    pt: "ex: Trabalho de framing, $X, começa semana que vem. Topa?",
    es: "ej: Trabajo de framing, $X, empieza la próxima semana. ¿Te interesa?",
  },
  send: { en: "Create links", pt: "Criar links", es: "Crear enlaces" },
  pending: { en: "Waiting", pt: "Aguardando", es: "Esperando" },
  interested: { en: "Interested", pt: "Topou", es: "Interesado" },
  declined: { en: "Declined", pt: "Recusou", es: "Rechazó" },
  copy: { en: "Copy link", pt: "Copiar link", es: "Copiar enlace" },
  copied: { en: "Copied", pt: "Copiado", es: "Copiado" },
  created: { en: "Links created — send them below", pt: "Links criados — envie abaixo", es: "Enlaces creados" },
  next: {
    en: "Someone declined — send to the next?",
    pt: "Alguém recusou — mandar pro próximo?",
    es: "Alguien rechazó — ¿enviar al siguiente?",
  },
} as const;

export function ShareWithSubs({
  estimateId,
  subs,
  shares,
}: {
  estimateId: string;
  subs: Subcontractor[];
  shares: ShareRow[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const base = typeof window !== "undefined" ? publicBaseUrl() : "";
  const linkFor = (token: string) => `${base}/share/${token}`;
  const subName = (id: string | null) => subs.find((s) => s.id === id)?.name ?? "—";

  function toggle(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function create() {
    startTransition(async () => {
      await shareWithSubs(estimateId, [...picked], message);
      toast.success(tr(L.created));
      setOpen(false);
      setPicked(new Set());
      setMessage("");
      router.refresh();
    });
  }

  async function copy(token: string, id: string) {
    await navigator.clipboard.writeText(linkFor(token));
    setCopiedId(id);
    toast.success(tr(L.copied));
    setTimeout(() => setCopiedId(null), 1500);
  }

  function whatsapp(token: string, msg: string | null) {
    const text = `${msg ? msg + "\n\n" : ""}${linkFor(token)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: tr(L.pending), cls: "text-amber-600 bg-amber-500/15", icon: <Clock className="h-3 w-3" /> },
    interested: { label: tr(L.interested), cls: "text-emerald-600 bg-emerald-500/15", icon: <Check className="h-3 w-3" /> },
    declined: { label: tr(L.declined), cls: "text-rose-600 bg-rose-500/15", icon: <X className="h-3 w-3" /> },
  };

  const someoneDeclined = shares.some((s) => s.status === "declined");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <HardHat className="h-4 w-4 text-primary" /> {tr(L.title)}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> {tr(L.pick)}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{tr(L.intro)}</p>
      </CardHeader>

      <CardContent className="space-y-2">
        {shares.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">{tr(L.intro)}</p>
        ) : (
          <>
            {shares.map((s) => {
              const meta = statusMeta[s.status] ?? statusMeta.pending;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.sub_name ?? subName(s.subcontractor_id)}</p>
                    <span className={cn("mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", meta.cls)}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  {s.status === "pending" && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="whatsapp" onClick={() => whatsapp(s.token, s.custom_message)}>
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={tr(L.copy)} onClick={() => copy(s.token, s.id)}>
                        {copiedId === s.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="delete"
                    onClick={() => startTransition(async () => { await deleteShare(s.id, estimateId); router.refresh(); })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {someoneDeclined && (
              <button
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-xs font-medium text-primary"
              >
                <Send className="h-3.5 w-3.5" /> {tr(L.next)}
              </button>
            )}
          </>
        )}
      </CardContent>

      {/* pick dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr(L.pick)}</DialogTitle>
          </DialogHeader>
          {subs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{tr(L.none)}</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {subs.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left",
                      picked.has(s.id) ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border",
                        picked.has(s.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                    >
                      {picked.has(s.id) && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      {s.trade && <span className="block truncate text-xs text-muted-foreground">{s.trade}</span>}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={tr(L.messagePh)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" disabled={pending || picked.size === 0} onClick={create}>
              <Send className="mr-1 h-4 w-4" /> {tr(L.send)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
