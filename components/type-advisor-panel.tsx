"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDict, useLang } from "@/components/providers";
import { ESTIMATE_RULES } from "@/lib/estimate-rules";
import { advisorFor, type AdvisorCategory, type AdvisorAudience } from "@/lib/advisor";
import { VoiceInput } from "@/components/voice-input";
import { Button } from "@/components/ui/button";
import type { AccessProfile } from "@/lib/access-profiles";
import type { EstimateType } from "@/lib/types";
import {
  Building2,
  Home,
  ScrollText,
  ShieldAlert,
  ClipboardList,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GLang = "en" | "es" | "pt";

/** Which question audiences each access profile interviews for (matrix §3). */
const PROFILE_AUDIENCES: Record<AccessProfile, AdvisorAudience[]> = {
  owner: ["sales", "tech", "ops"],
  sales: ["sales"],
  estimator: ["tech", "ops"],
  project_manager: ["tech", "ops"],
  field: ["ops"],
  crew: ["ops"],
  subcontractor: ["ops"],
};

const CASCADE_L = {
  of: { en: "of", pt: "de", es: "de" },
  prev: { en: "Back", pt: "Voltar", es: "Atrás" },
  skip: { en: "Skip", pt: "Pular", es: "Omitir" },
  next: { en: "Next", pt: "Próxima", es: "Siguiente" },
  finish: { en: "Done", pt: "Concluir", es: "Terminar" },
  done: {
    en: "Interview complete — answers travel with the estimate.",
    pt: "Entrevista concluída — as respostas seguem com o estimate.",
    es: "Entrevista completa — las respuestas van con el estimado.",
  },
  edit: { en: "Review answers", pt: "Revisar respostas", es: "Revisar respuestas" },
} as const;

interface Props {
  type: EstimateType;
  materialsIncluded: boolean;
  onMaterialsChange: (v: boolean) => void;
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  /** Filters the cascade to this profile's questions. Defaults to owner (all). */
  accessProfile?: AccessProfile;
}

export function TypeAdvisorPanel({
  type,
  materialsIncluded,
  onMaterialsChange,
  answers,
  onAnswerChange,
  accessProfile = "owner",
}: Props) {
  const t = useDict();
  const lang = useLang() as GLang;
  const nf = t.newflow;
  const rules = ESTIMATE_RULES[type];
  const [showRules, setShowRules] = useState(false);
  const [idx, setIdx] = useState(0);
  const questions = advisorFor(type, materialsIncluded, PROFILE_AUDIENCES[accessProfile]);
  const ctr = (m: Record<GLang, string>) => m[lang] ?? m.en;

  const catLabel = (c: AdvisorCategory) => nf.categories[c] ?? c;
  const TypeIcon = type === "commercial" ? Building2 : Home;

  return (
    <div className="space-y-3">
      {/* type header */}
      <Card className="border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TypeIcon className="h-5 w-5 text-primary" />
            {nf.types[type]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{nf.typeSubtitle[type]}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* materials included */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-3">
              <Label className="text-sm font-medium">{nf.materialsQ}</Label>
              <p className="text-xs text-muted-foreground">{nf.materialsHint}</p>
            </div>
            <Switch checked={materialsIncluded} onCheckedChange={onMaterialsChange} />
          </div>

          {/* collapsible rules */}
          <button
            type="button"
            onClick={() => setShowRules((v) => !v)}
            className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm font-medium"
          >
            <span className="flex items-center gap-1.5">
              <ScrollText className="h-4 w-4 text-primary" /> {nf.rulesTitle}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition", showRules && "rotate-180")} />
          </button>

          {showRules && (
            <div className="space-y-3 rounded-md border p-3">
              <RuleRow icon={<ScrollText className="h-4 w-4" />} label={nf.code} text={rules.codeBasis[lang]} />
              <RuleRow icon={<ClipboardList className="h-4 w-4" />} label={nf.permit} text={rules.permit[lang]} />
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CreditCard className="h-4 w-4" /> {nf.payment}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rules.paymentSchedule.map((m, i) => (
                    <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {m.label[lang]} {m.pct}%
                    </span>
                  ))}
                  {rules.retainagePct > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">
                      {nf.retainage} {rules.retainagePct}%
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{nf.prereqs}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {rules.prerequisites.map((p, i) => (
                    <li key={i}>{p[lang]}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                  <ShieldAlert className="h-4 w-4" /> {nf.risks}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {rules.risks.map((r, i) => (
                    <li key={i}>{r[lang]}</li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {nf.suggests
                  .replace("{margin}", String(rules.suggestedMarginPct))
                  .replace("{contingency}", String(rules.contingencyPct))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* advisor interview — one question at a time (cascade) */}
      {questions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{nf.advisorTitle}</CardTitle>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {Math.min(idx + 1, questions.length)} {ctr(CASCADE_L.of)} {questions.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{nf.advisorHint}</p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((Math.min(idx, questions.length) / questions.length) * 100)}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {idx < questions.length ? (
              (() => {
                const question = questions[idx];
                return (
                  <div key={question.id} className="space-y-2 animate-fade-up">
                    <p className="text-sm font-medium">
                      <span className="mr-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {catLabel(question.category)}
                      </span>
                      {question.q[lang]}
                    </p>
                    <p className="text-xs text-muted-foreground">💡 {question.why[lang]}</p>
                    <Textarea
                      value={answers[question.id] ?? ""}
                      onChange={(e) => onAnswerChange(question.id, e.target.value)}
                      placeholder={nf.answerPlaceholder}
                      className="min-h-[64px] text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => setIdx((i) => Math.max(0, i - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" /> {ctr(CASCADE_L.prev)}
                      </Button>
                      <div className="flex-1" />
                      <VoiceInput
                        onTranscript={(text) =>
                          onAnswerChange(
                            question.id,
                            (answers[question.id]?.trim() ? `${answers[question.id].trim()} ` : "") + text
                          )
                        }
                      />
                      {!answers[question.id]?.trim() && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIdx((i) => i + 1)}>
                          {ctr(CASCADE_L.skip)}
                        </Button>
                      )}
                      <Button type="button" size="sm" onClick={() => setIdx((i) => i + 1)}>
                        {idx === questions.length - 1 ? ctr(CASCADE_L.finish) : ctr(CASCADE_L.next)}
                        <ChevronRight className="ml-0.5 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-3 animate-fade-up">
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {ctr(CASCADE_L.done)}
                </p>
                <div className="grid gap-1">
                  {questions.map((question, i) =>
                    answers[question.id]?.trim() ? (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setIdx(i)}
                        className="flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="font-medium">{question.q[lang]}</span>{" "}
                          <span className="text-muted-foreground">— {answers[question.id]}</span>
                        </span>
                      </button>
                    ) : null
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setIdx(0)}>
                  {ctr(CASCADE_L.edit)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleRow({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-xs">{text}</p>
    </div>
  );
}
