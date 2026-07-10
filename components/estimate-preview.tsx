"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDict, useLang } from "@/components/providers";
import { useEstimateContext } from "@/components/new-estimate-context";
import { formatMoney } from "@/lib/format";
import { saveEstimate } from "@/app/actions/estimates";
import { Users, CalendarDays, Ruler } from "lucide-react";
import type { EstimateTotals, TakeoffResult } from "@/lib/takeoff/types";

export interface EstimatePayload {
  input: {
    trade: string;
    title: string;
    quality_tier?: "basic" | "standard" | "premium";
    conditions?: Record<string, unknown>;
    location?: string;
    start_timeframe?: string;
    client_name?: string;
    project_id?: string;
    estimate_type?: "residential" | "commercial";
    materials_included?: boolean;
    advisor_answers?: Record<string, unknown>;
  };
  takeoff: TakeoffResult;
  totals: EstimateTotals;
}

const SCORE_STYLES: Record<string, string> = {
  healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function EstimatePreview({ payload }: { payload: EstimatePayload }) {
  const t = useDict();
  const lang = useLang();
  const ctx = useEstimateContext();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const { takeoff, totals, input } = payload;
  const scoreLabel = { healthy: t.estimate.healthy, medium: t.estimate.medium, low: t.estimate.low }[
    totals.margin_score
  ];

  const groups: { label: string; kinds: string[] }[] = [
    { label: t.estimate.material, kinds: ["material"] },
    { label: t.estimate.labor, kinds: ["labor", "other"] },
    { label: t.estimate.demoDisposal, kinds: ["demo", "disposal"] },
  ];

  function handleSave() {
    startTransition(async () => {
      const merged: EstimatePayload = {
        ...payload,
        input: {
          ...payload.input,
          project_id: ctx.projectId ?? undefined,
          estimate_type: ctx.estimateType ?? undefined,
          materials_included: ctx.materialsIncluded ?? undefined,
          advisor_answers: ctx.advisorAnswers ?? undefined,
        },
      };
      const { id } = await saveEstimate(merged);
      setSaved(true);
      router.push(`/estimate/${id}`);
    });
  }

  return (
    <Card className="my-2 w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{input.title}</CardTitle>
          <Badge className={SCORE_STYLES[totals.margin_score]}>
            {t.estimate.marginScore}: {scoreLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Ruler className="h-3 w-3" /> {takeoff.area_sqft} sqft
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {takeoff.crew_size} {t.estimate.people}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {takeoff.est_days} {t.estimate.days}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {groups.map(({ label, kinds }) => {
          const items = takeoff.items.filter((i) => kinds.includes(i.kind));
          if (items.length === 0) return null;
          return (
            <div key={label}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
              {items.map((item, i) => (
                <div key={i} className="flex justify-between gap-2 py-0.5">
                  <span className="min-w-0 flex-1 truncate">
                    {item.description}
                    {item.is_estimated_price && (
                      <span className="ml-1 text-[10px] text-amber-600">*</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {item.qty} {item.unit}
                  </span>
                  <span className="w-20 text-right font-medium">
                    {formatMoney(item.total, lang)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        <Separator />
        <div className="space-y-1">
          <Row label={t.estimate.subtotal} value={formatMoney(totals.subtotal, lang)} />
          <Row label={t.estimate.overhead} value={formatMoney(totals.overhead_amount, lang)} />
          <Row label={t.estimate.profit} value={formatMoney(totals.profit_amount, lang)} />
          {totals.tax_amount > 0 && (
            <Row label={t.estimate.tax} value={formatMoney(totals.tax_amount, lang)} />
          )}
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>{t.estimate.total}</span>
            <span>{formatMoney(totals.total, lang)}</span>
          </div>
        </div>

        {takeoff.items.some((i) => i.is_estimated_price) && (
          <p className="text-[10px] text-amber-600">* {t.estimate.estimatedPrice}</p>
        )}

        <Button onClick={handleSave} disabled={pending || saved} className="w-full">
          {pending ? t.chat.saving : t.chat.saveEstimate}
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
