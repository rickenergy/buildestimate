"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDict, useLang } from "@/components/providers";
import { ESTIMATE_RULES } from "@/lib/estimate-rules";
import { advisorFor, type AdvisorCategory } from "@/lib/advisor";
import type { EstimateType } from "@/lib/types";
import {
  Building2,
  Home,
  ScrollText,
  ShieldAlert,
  ClipboardList,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GLang = "en" | "es" | "pt";

interface Props {
  type: EstimateType;
  materialsIncluded: boolean;
  onMaterialsChange: (v: boolean) => void;
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
}

export function TypeAdvisorPanel({
  type,
  materialsIncluded,
  onMaterialsChange,
  answers,
  onAnswerChange,
}: Props) {
  const t = useDict();
  const lang = useLang() as GLang;
  const nf = t.newflow;
  const rules = ESTIMATE_RULES[type];
  const [showRules, setShowRules] = useState(false);
  const questions = advisorFor(type, materialsIncluded);

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

      {/* advisor interview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{nf.advisorTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{nf.advisorHint}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="space-y-1">
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
                className="min-h-[52px] text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>
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
