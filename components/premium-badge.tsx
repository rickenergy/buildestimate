"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useLang } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { planStatus, type PlanInput } from "@/lib/premium";

type Lang = "en" | "pt" | "es";

const L = {
  premium: { en: "Premium", pt: "Premium", es: "Premium" },
  plan: { en: "Your plan", pt: "Seu plano", es: "Tu plan" },
  trial: { en: "Free trial", pt: "Teste grátis", es: "Prueba gratis" },
  pro: { en: "Pro", pt: "Pro", es: "Pro" },
  free: { en: "Free", pt: "Grátis", es: "Gratis" },
  daysLeft: { en: "days left", pt: "dias restantes", es: "días restantes" },
  expired: {
    en: "Your trial has ended — upgrade to keep premium features.",
    pt: "Seu teste acabou — assine para manter os recursos premium.",
    es: "Tu prueba terminó — mejora para mantener las funciones premium.",
  },
  trialOn: {
    en: "Premium features unlocked during your trial.",
    pt: "Recursos premium liberados durante o teste.",
    es: "Funciones premium desbloqueadas durante la prueba.",
  },
  proOn: {
    en: "All premium features are active.",
    pt: "Todos os recursos premium estão ativos.",
    es: "Todas las funciones premium están activas.",
  },
  getPro: { en: "Get Pro — $49/mo", pt: "Assinar Pro — $49/mês", es: "Obtener Pro — $49/mes" },
} as const;

/** Small gold crown chip — marks a premium feature. Tooltip via title. */
export function PremiumBadge({ className = "" }: { className?: string }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  return (
    <span
      title={tr(L.premium)}
      className={
        "inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 " +
        className
      }
    >
      <Crown className="h-3 w-3" />
      {tr(L.premium)}
    </span>
  );
}

/** Plan status card for settings — trial countdown or paid state + upgrade CTA. */
export function PlanCard({ profile }: { profile: PlanInput }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const s = planStatus(profile);

  const planLabel = s.isPro ? tr(L.pro) : s.isTrial ? tr(L.trial) : tr(L.free);
  const statusLine = s.isPro
    ? tr(L.proOn)
    : s.trialActive
      ? `${s.trialDaysLeft} ${tr(L.daysLeft)} · ${tr(L.trialOn)}`
      : tr(L.expired);

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
            (s.hasAccess ? "bg-amber-400/20 text-amber-500" : "bg-muted text-muted-foreground")
          }
        >
          <Crown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {tr(L.plan)}: {planLabel}
          </p>
          <p className="text-xs text-muted-foreground">{statusLine}</p>
        </div>
        {!s.isPro && (
          <Link
            href="/settings/billing"
            className="press shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {tr(L.getPro)}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
