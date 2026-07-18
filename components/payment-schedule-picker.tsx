"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { updatePaymentSchedulePreset } from "@/app/actions/estimates";
import { PAYMENT_PRESETS } from "@/lib/payment-schedules";
import { CreditCard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Payment schedule", pt: "Cronograma de pagamento", es: "Cronograma de pago" },
} as const;

export function PaymentSchedulePicker({
  estimateId,
  value,
}: {
  estimateId: string;
  value: string | null;
}) {
  const lang = useLang() as Lang;
  const [selected, setSelected] = useState(value ?? PAYMENT_PRESETS[0].id);
  const [, startTransition] = useTransition();

  function pick(id: string) {
    setSelected(id);
    startTransition(() => updatePaymentSchedulePreset(estimateId, id));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <CreditCard className="h-4 w-4 text-primary" /> {L.title[lang] ?? L.title.en}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {PAYMENT_PRESETS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className={cn(
                "press flex w-full items-start gap-3 rounded-xl border p-3 text-left",
                active ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{p.label[lang] ?? p.label.en}</span>
                <span className="block text-xs text-muted-foreground">{p.hint[lang] ?? p.hint.en}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {p.splits.map((s, i) => (
                    <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {s.label[lang] ?? s.label.en} {s.pct}%
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
