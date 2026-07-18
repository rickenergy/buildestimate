"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { PlanCard } from "@/components/premium-badge";
import { createSubscriptionCheckout } from "@/app/actions/subscription";
import { planStatus, type PlanInput } from "@/lib/premium";
import { Check, Loader2, Crown } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Billing & plan", pt: "Assinatura e plano", es: "Facturación y plan" },
  free: { en: "Free", pt: "Grátis", es: "Gratis" },
  pro: { en: "Pro", pt: "Pro", es: "Pro" },
  perMo: { en: "/mo", pt: "/mês", es: "/mes" },
  freeDesc: { en: "The basics to get started.", pt: "O básico para começar.", es: "Lo básico para empezar." },
  proDesc: { en: "Everything, unlocked.", pt: "Tudo, liberado.", es: "Todo, desbloqueado." },
  current: { en: "Current plan", pt: "Plano atual", es: "Plan actual" },
  upgrade: { en: "Upgrade to Pro", pt: "Assinar Pro", es: "Mejorar a Pro" },
  needsStripe: {
    en: "Payments aren't configured yet (STRIPE_SECRET_KEY). Add it in Vercel to enable checkout.",
    pt: "Pagamentos ainda não configurados (STRIPE_SECRET_KEY). Adicione na Vercel para habilitar o checkout.",
    es: "Pagos aún no configurados (STRIPE_SECRET_KEY). Agrégalo en Vercel para habilitar el pago.",
  },
  success: {
    en: "Payment received — welcome to Pro! It may take a moment to reflect.",
    pt: "Pagamento recebido — bem-vindo ao Pro! Pode levar um instante para atualizar.",
    es: "Pago recibido — ¡bienvenido a Pro! Puede tardar un momento en reflejarse.",
  },
  canceled: { en: "Checkout canceled.", pt: "Checkout cancelado.", es: "Pago cancelado." },
  freeFeat: {
    en: ["Estimates & AI drafts", "Proposals & PDF", "Basic dashboard"],
    pt: ["Estimates & rascunhos IA", "Propostas & PDF", "Dashboard básico"],
    es: ["Estimados & borradores IA", "Propuestas & PDF", "Panel básico"],
  },
  proFeat: {
    en: ["Everything in Free", "Inventory & cheapest-store pricing", "Market intelligence", "Job tracking & finance", "Priority support"],
    pt: ["Tudo do Grátis", "Estoque & preço mais barato por loja", "Inteligência de mercado", "Controle de obra & finanças", "Suporte prioritário"],
    es: ["Todo lo de Gratis", "Inventario & precio más barato", "Inteligencia de mercado", "Control de obra & finanzas", "Soporte prioritario"],
  },
} as const;

export function BillingView({
  profile,
  flash,
}: {
  profile: PlanInput;
  flash?: "success" | "canceled" | null;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [pending, startTransition] = useTransition();
  const [needsStripe, setNeedsStripe] = useState(false);
  const s = planStatus(profile);

  function upgrade() {
    setNeedsStripe(false);
    startTransition(async () => {
      const res = await createSubscriptionCheckout();
      if (res.needsStripe) {
        setNeedsStripe(true);
      } else if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{tr(L.title)}</h1>

      {flash === "success" && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {tr(L.success)}
        </p>
      )}
      {flash === "canceled" && (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{tr(L.canceled)}</p>
      )}

      <PlanCard profile={profile} />

      <div className="grid gap-3">
        {/* Free */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{tr(L.free)}</span>
              <span className="text-lg font-bold">$0</span>
            </div>
            <p className="text-xs text-muted-foreground">{tr(L.freeDesc)}</p>
            <ul className="grid gap-1 pt-1">
              {L.freeFeat[lang].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-sm">
                  <Check className="h-3.5 w-3.5 text-muted-foreground" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="border-amber-400/50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Crown className="h-4 w-4 text-amber-500" /> {tr(L.pro)}
              </span>
              <span className="text-lg font-bold">
                $49<span className="text-xs font-normal text-muted-foreground">{tr(L.perMo)}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{tr(L.proDesc)}</p>
            <ul className="grid gap-1 pt-1">
              {L.proFeat[lang].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-sm">
                  <Check className="h-3.5 w-3.5 text-amber-500" /> {f}
                </li>
              ))}
            </ul>
            {s.isPro ? (
              <p className="pt-1 text-center text-sm font-medium text-emerald-600">✓ {tr(L.current)}</p>
            ) : (
              <Button className="mt-1 w-full" disabled={pending} onClick={upgrade}>
                {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crown className="mr-1 h-4 w-4" />}
                {tr(L.upgrade)}
              </Button>
            )}
            {needsStripe && (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {tr(L.needsStripe)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
