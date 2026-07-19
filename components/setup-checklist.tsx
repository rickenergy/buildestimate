"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { CheckCircle2, Circle, ChevronRight, Rocket } from "lucide-react";

type Lang = "en" | "pt" | "es";

export interface SetupState {
  company: boolean;
  prices: boolean;
  client: boolean;
  estimate: boolean;
  proposal: boolean;
  team: boolean;
}

const L = {
  title: { en: "First steps", pt: "Primeiros passos", es: "Primeros pasos" },
  subtitle: {
    en: "Set up once, sell forever.",
    pt: "Configure uma vez, venda sempre.",
    es: "Configura una vez, vende siempre.",
  },
  steps: {
    company: {
      label: { en: "Company & branding", pt: "Empresa & marca", es: "Empresa & marca" },
      href: "/settings",
    },
    prices: {
      label: { en: "Review your price book", pt: "Revisar catálogo de preços", es: "Revisar catálogo de precios" },
      href: "/prices",
    },
    client: {
      label: { en: "Add your first client", pt: "Cadastrar o primeiro cliente", es: "Agregar el primer cliente" },
      href: "/clients",
    },
    estimate: {
      label: { en: "Create an estimate", pt: "Criar um estimate", es: "Crear un estimado" },
      href: "/estimate/new",
    },
    proposal: {
      label: { en: "Send a proposal", pt: "Enviar uma proposta", es: "Enviar una propuesta" },
      href: "/estimates",
    },
    team: {
      label: { en: "Invite your team", pt: "Convidar sua equipe", es: "Invitar a tu equipo" },
      href: "/settings/team",
    },
  },
} as const;

const ORDER: (keyof SetupState)[] = ["company", "prices", "client", "estimate", "proposal", "team"];

/** Onboarding progress card — hides itself once everything is done. */
export function SetupChecklist({ state }: { state: SetupState }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;

  const done = ORDER.filter((k) => state[k]).length;
  if (done === ORDER.length) return null;
  const pct = Math.round((done / ORDER.length) * 100);

  return (
    <Card className="animate-fade-up border-primary/20">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{tr(L.title)}</p>
            <p className="text-xs text-muted-foreground">{tr(L.subtitle)}</p>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
            {done}/{ORDER.length}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid gap-0.5">
          {ORDER.map((k) => {
            const s = L.steps[k];
            const isDone = state[k];
            return isDone ? (
              <div key={k} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="line-through">{tr(s.label)}</span>
              </div>
            ) : (
              <Link
                key={k}
                href={s.href}
                className="press flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="min-w-0 flex-1">{tr(s.label)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
