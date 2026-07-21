"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import { VoiceInput } from "@/components/voice-input";
import {
  analyzeBlueprintPage,
  saveBlueprintAnswers,
  setBlueprintTrade,
  type BlueprintRow,
  type SheetType,
} from "@/app/actions/blueprints";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  HelpCircle,
  CheckCircle2,
  Ruler,
  TriangleAlert,
} from "lucide-react";

type Lang = "en" | "pt" | "es";

const SHEET_LABEL: Record<SheetType, Record<Lang, string>> = {
  architectural: { en: "Architectural", pt: "Arquitetônica", es: "Arquitectónica" },
  structural: { en: "Structural", pt: "Estrutural", es: "Estructural" },
  mep: { en: "MEP (mech/elec/plumb)", pt: "MEP (elétrica/hidráulica)", es: "MEP (mec/elec/plom)" },
  civil: { en: "Civil / Site", pt: "Civil / Terreno", es: "Civil / Sitio" },
  demolition: { en: "Demolition", pt: "Demolição", es: "Demolición" },
  landscape: { en: "Landscape", pt: "Paisagismo", es: "Paisajismo" },
  other: { en: "Other", pt: "Outra", es: "Otra" },
};
const SHEET_CLS: Record<SheetType, string> = {
  architectural: "bg-primary/15 text-primary",
  structural: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  mep: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  civil: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  demolition: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  landscape: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
};

const L = {
  back: { en: "All plans", pt: "Todas as plantas", es: "Todos los planos" },
  intro: {
    en: "Tap a sheet to read it. The AI classifies the discipline, lists the trades, and asks about anything it can't be sure of — it never invents a number.",
    pt: "Toque numa folha para lê-la. A IA classifica a disciplina, lista os trades e pergunta o que não tem certeza — nunca inventa número.",
    es: "Toca una hoja para leerla. La IA clasifica la disciplina, lista los oficios y pregunta lo que no puede asegurar — nunca inventa un número.",
  },
  sheets: { en: "Sheets", pt: "Folhas", es: "Hojas" },
  read: { en: "Read this sheet", pt: "Ler esta folha", es: "Leer esta hoja" },
  reading: { en: "Reading…", pt: "Lendo…", es: "Leyendo…" },
  reread: { en: "Read again", pt: "Ler de novo", es: "Leer de nuevo" },
  needsKey: { en: "AI key not configured (AI_GATEWAY_API_KEY).", pt: "Chave de IA não configurada.", es: "Clave de IA no configurada." },
  scope: { en: "Scope", pt: "Escopo", es: "Alcance" },
  trades: { en: "Trades on this sheet", pt: "Trades nesta folha", es: "Oficios en esta hoja" },
  questions: { en: "Confirm before measuring", pt: "Confirme antes de medir", es: "Confirma antes de medir" },
  questionsHint: {
    en: "Anything the AI couldn't be sure of — it asks instead of guessing.",
    pt: "Tudo que a IA não teve certeza — ela pergunta em vez de chutar.",
    es: "Todo lo que la IA no pudo asegurar — pregunta en vez de adivinar.",
  },
  answer: { en: "Answer…", pt: "Resposta…", es: "Respuesta…" },
  save: { en: "Save answers", pt: "Salvar respostas", es: "Guardar respuestas" },
  pick: { en: "Take off this trade", pt: "Fazer takeoff deste trade", es: "Takeoff de este oficio" },
  chosen: { en: "Taking off", pt: "Fazendo takeoff de", es: "Takeoff de" },
  scaleWarn: {
    en: "Scale not detected — confirm it in the questions.",
    pt: "Escala não detectada — confirme nas perguntas.",
    es: "Escala no detectada — confírmala en las preguntas.",
  },
  next: {
    en: "Scale calibration + area measuring is the next phase.",
    pt: "Calibração de escala + medição de áreas é a próxima fase.",
    es: "Calibración de escala + medición de áreas es la próxima fase.",
  },
} as const;

export function BlueprintDetail({
  blueprint,
  pageUrls,
}: {
  blueprint: BlueprintRow;
  pageUrls: Record<number, string>;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(blueprint.page_count === 1 ? 1 : null);
  const [answers, setAnswers] = useState<Record<string, string>>(blueprint.answers ?? {});

  const pages = blueprint.pages ?? [];
  const analysis = blueprint.analysis ?? {};

  function analyze(i: number) {
    setReading(i);
    startTransition(async () => {
      const res = await analyzeBlueprintPage(blueprint.id, i);
      setReading(null);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok) router.refresh();
      else toast.error(res.error ?? "Error");
    });
  }
  function saveAnswers() {
    startTransition(async () => {
      await saveBlueprintAnswers(blueprint.id, answers);
      router.refresh();
      toast.success("✓");
    });
  }
  function pickTrade(key: string) {
    startTransition(async () => {
      await setBlueprintTrade(blueprint.id, key);
      router.refresh();
    });
  }

  const sel = selected != null ? analysis[String(selected)] : undefined;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <Link href="/blueprints" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>
      <h1 className="text-xl font-bold">{blueprint.name}</h1>
      <p className="-mt-2 text-sm text-muted-foreground">{tr(L.intro)}</p>

      {/* Sheets grid */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(L.sheets)} · {blueprint.page_count}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {pages.map((p) => {
            const done = analysis[String(p.i)];
            const active = selected === p.i;
            return (
              <button
                key={p.i}
                onClick={() => setSelected(p.i)}
                className={
                  "relative overflow-hidden rounded-xl border text-left transition " +
                  (active ? "ring-2 ring-primary" : "hover:opacity-90")
                }
              >
                {pageUrls[p.i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pageUrls[p.i]} alt={`Sheet ${p.i}`} className="aspect-[3/4] w-full bg-white object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {p.i}
                </span>
                {done && (
                  <span className={`absolute bottom-1 left-1 right-1 truncate rounded px-1 py-0.5 text-center text-[9px] font-semibold ${SHEET_CLS[done.sheet_type]}`}>
                    {SHEET_LABEL[done.sheet_type][lang] ?? SHEET_LABEL[done.sheet_type].en}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected sheet */}
      {selected != null && (
        <div className="space-y-3">
          {/* big preview */}
          {pageUrls[selected] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pageUrls[selected]} alt={`Sheet ${selected}`} className="w-full rounded-2xl border bg-white object-contain" />
          )}

          {!sel ? (
            <Button className="w-full" disabled={reading === selected} onClick={() => analyze(selected)}>
              {reading === selected ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {reading === selected ? tr(L.reading) : tr(L.read)}
            </Button>
          ) : (
            <>
              {/* Discipline + label */}
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SHEET_CLS[sel.sheet_type]}`}>
                  {SHEET_LABEL[sel.sheet_type][lang] ?? SHEET_LABEL[sel.sheet_type].en}
                </span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">{sel.sheet_label}</span>
              </div>

              {/* Scope */}
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.scope)}</p>
                  <p className="text-sm leading-relaxed">{sel.scope}</p>
                  {!sel.scale_detected && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      <Ruler className="h-3.5 w-3.5" /> {tr(L.scaleWarn)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trades */}
              {sel.trades.length > 0 && (
                <Card>
                  <CardContent className="grid gap-1.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(L.trades)}</p>
                    {sel.trades.map((t) => {
                      const chosen = blueprint.chosen_trade === t.key;
                      const conf = Math.round(t.confidence * 100);
                      return (
                        <button
                          key={t.key}
                          onClick={() => pickTrade(t.key)}
                          disabled={pending}
                          className={
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition " +
                            (chosen ? "border-primary bg-primary/5" : "hover:bg-muted")
                          }
                        >
                          {chosen ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <span className="h-4 w-4 shrink-0 rounded-full border" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                          <span
                            className={
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                              (conf >= 75
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : conf >= 45
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400")
                            }
                          >
                            {conf}%
                          </span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Confidence-gated questions */}
              {sel.questions.length > 0 && (
                <Card>
                  <CardContent className="grid gap-3 p-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <HelpCircle className="h-4 w-4 text-primary" /> {tr(L.questions)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tr(L.questionsHint)}</p>
                    </div>
                    {sel.questions.map((qq) => (
                      <div key={qq.id} className="grid gap-1.5 rounded-lg border p-3">
                        <p className="text-sm font-medium">{qq.q}</p>
                        <p className="text-xs text-muted-foreground">💡 {qq.why}</p>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={answers[qq.id] ?? ""}
                            onChange={(e) => setAnswers((s) => ({ ...s, [qq.id]: e.target.value }))}
                            placeholder={tr(L.answer)}
                            className="h-9"
                          />
                          <VoiceInput
                            onTranscript={(text) =>
                              setAnswers((s) => ({ ...s, [qq.id]: (s[qq.id]?.trim() ? `${s[qq.id].trim()} ` : "") + text }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button size="sm" disabled={pending} onClick={saveAnswers}>
                      {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                      {tr(L.save)}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {blueprint.chosen_trade && (
                <div className="rounded-2xl border bg-muted/40 p-4 text-center">
                  <p className="text-sm font-medium">
                    {tr(L.chosen)}: <span className="text-primary">{blueprint.chosen_trade}</span>
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <TriangleAlert className="h-3.5 w-3.5" /> {tr(L.next)}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" disabled={reading === selected} onClick={() => analyze(selected)}>
                  {reading === selected ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                  {tr(L.reread)}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
