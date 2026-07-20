"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { TIER_STYLE, TIER_LABEL, type SubScore } from "@/lib/sub-score";
import { SubDocsChecklist } from "@/components/sub-docs-checklist";
import { SubContractsCard } from "@/components/sub-contracts-card";
import { SubFinanceCard } from "@/components/sub-finance-card";
import type { SubDoc } from "@/app/actions/subdocs";
import type { SubContractRow } from "@/app/actions/sub-contracts";
import type { SubPaymentRow } from "@/app/actions/sub-payments";
import type { Subcontractor } from "@/lib/types";
import type { SubShareHistory, SubIncidentRow } from "@/lib/sub-history";
import {
  HardHat,
  Phone,
  Mail,
  MessageCircle,
  ArrowLeft,
  History,
  TriangleAlert,
  Gauge,
} from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  back: { en: "All subcontractors", pt: "Todos os subcontratados", es: "Todos los subcontratistas" },
  score: { en: "Score", pt: "Score", es: "Score" },
  interest: { en: "Says yes", pt: "Aceita", es: "Acepta" },
  response: { en: "Avg response", pt: "Resposta média", es: "Respuesta media" },
  hours: { en: "h", pt: "h", es: "h" },
  docs: { en: "Compliance", pt: "Documentação", es: "Documentación" },
  license: { en: "License", pt: "Licença", es: "Licencia" },
  insurance: { en: "Insurance", pt: "Seguro", es: "Seguro" },
  expired: { en: "expired", pt: "vencido", es: "vencido" },
  missing: { en: "missing", pt: "faltando", es: "falta" },
  ok: { en: "on file", pt: "em dia", es: "al día" },
  history: { en: "Work history", pt: "Histórico de trabalhos", es: "Historial de trabajos" },
  noHistory: {
    en: "No shared jobs yet — share an estimate to build history.",
    pt: "Nenhum trabalho compartilhado ainda — compartilhe um estimate para criar histórico.",
    es: "Sin trabajos compartidos aún — comparte un estimado para crear historial.",
  },
  incidents: { en: "Incidents", pt: "Incidentes", es: "Incidentes" },
  st: {
    interested: { en: "Yes", pt: "Sim", es: "Sí" },
    declined: { en: "No", pt: "Não", es: "No" },
    pending: { en: "Pending", pt: "Pendente", es: "Pendiente" },
  },
  respondedIn: { en: "answered in", pt: "respondeu em", es: "respondió en" },
} as const;

const hoursBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 3_600_000);

export function SubProfile({
  sub,
  score,
  shares,
  incidents,
  docs,
  contracts,
  payments,
  baseUrl,
}: {
  sub: Subcontractor;
  score: SubScore;
  shares: SubShareHistory[];
  incidents: SubIncidentRow[];
  docs: SubDoc[];
  contracts: SubContractRow[];
  payments: SubPaymentRow[];
  baseUrl: string;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const tier = TIER_STYLE[score.tier];
  const phoneDigits = sub.phone?.replace(/\D/g, "");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <Link href="/subcontractors" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>

      {/* Header */}
      <header className="flex items-start gap-3 animate-fade-up">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HardHat className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{sub.company || sub.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {sub.company ? sub.name : null}
            {sub.trade ? `${sub.company ? " · " : ""}${sub.trade}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sub.phone && (
              <a href={`tel:${sub.phone}`} className="press inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                <Phone className="h-3 w-3" /> {sub.phone}
              </a>
            )}
            {phoneDigits && (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted"
              >
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            )}
            {sub.email && (
              <a href={`mailto:${sub.email}`} className="press inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                <Mail className="h-3 w-3" /> {sub.email}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Score */}
      <Card className="animate-fade-up">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold tabular-nums">{score.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{tr(L.score)}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tier.cls}`}>
              {tier.emoji} {TIER_LABEL[score.tier][lang] ?? TIER_LABEL[score.tier].en}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {score.interestRatePct != null && (
                <span>
                  {tr(L.interest)}: <b className="text-foreground">{score.interestRatePct}%</b>
                </span>
              )}
              {score.avgResponseHours != null && (
                <span>
                  {tr(L.response)}: <b className="text-foreground">{score.avgResponseHours}{tr(L.hours)}</b>
                </span>
              )}
            </div>
          </div>
          <Gauge className="h-8 w-8 shrink-0 text-muted-foreground/40" />
        </CardContent>
      </Card>

      {/* Hiring compliance checklist (W-9, COI, agreement…) */}
      <SubDocsChecklist subcontractorId={sub.id} docs={docs} />

      {/* Signable contracts */}
      <SubContractsCard subcontractorId={sub.id} contracts={contracts} baseUrl={baseUrl} />

      {/* Payments: contracted vs paid */}
      <SubFinanceCard subcontractorId={sub.id} contracts={contracts} payments={payments} />

      {/* History */}
      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> {tr(L.history)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1.5">
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr(L.noHistory)}</p>
          ) : (
            shares.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                <span
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (s.status === "interested" ? "bg-emerald-500" : s.status === "declined" ? "bg-rose-500" : "bg-amber-400")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.job_title ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.created_at.slice(0, 10)}
                    {s.responded_at ? ` · ${tr(L.respondedIn)} ${hoursBetween(s.created_at, s.responded_at)}${tr(L.hours)}` : ""}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                    (s.status === "interested"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : s.status === "declined"
                        ? "bg-rose-500/15 text-rose-600"
                        : "bg-amber-500/15 text-amber-600")
                  }
                >
                  {tr(L.st[(s.status as keyof typeof L.st) in L.st ? (s.status as keyof typeof L.st) : "pending"])}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Incidents */}
      {incidents.length > 0 && (
        <Card className="animate-fade-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="h-4 w-4 text-amber-500" /> {tr(L.incidents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {incidents.map((i) => (
              <div key={i.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                <span
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (i.severity === "red" ? "bg-rose-500" : i.severity === "yellow" ? "bg-amber-400" : "bg-emerald-500")
                  }
                />
                <span className="min-w-0 flex-1 truncate">{i.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{i.created_at.slice(0, 10)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
