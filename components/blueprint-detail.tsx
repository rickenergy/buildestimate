"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import { VoiceInput } from "@/components/voice-input";
import {
  analyzeBlueprint,
  saveBlueprintAnswers,
  setBlueprintTrade,
  type BlueprintRow,
} from "@/app/actions/blueprints";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  HelpCircle,
  CheckCircle2,
  Ruler,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  back: { en: "All plans", pt: "Todas as plantas", es: "Todos los planos" },
  analyze: { en: "Read plan with AI", pt: "Ler planta com IA", es: "Leer plano con IA" },
  reanalyze: { en: "Read again", pt: "Ler de novo", es: "Leer de nuevo" },
  analyzing: { en: "Reading the plan…", pt: "Lendo a planta…", es: "Leyendo el plano…" },
  needsKey: { en: "AI key not configured (AI_GATEWAY_API_KEY).", pt: "Chave de IA não configurada.", es: "Clave de IA no configurada." },
  needsImage: {
    en: "PDF reading comes next — for now upload a photo/image of the sheet.",
    pt: "Leitura de PDF vem a seguir — por ora suba uma foto/imagem da folha.",
    es: "La lectura de PDF viene después — por ahora sube una foto/imagen.",
  },
  scope: { en: "What the AI sees", pt: "O que a IA vê", es: "Lo que la IA ve" },
  trades: { en: "Trades on this plan", pt: "Trades nesta planta", es: "Oficios en este plano" },
  tradesHint: {
    en: "Pick the trade to take off. Confidence is honest — low means verify.",
    pt: "Escolha o trade pra fazer o takeoff. A confiança é honesta — baixa = confira.",
    es: "Elige el oficio para el takeoff. La confianza es honesta — baja = verifica.",
  },
  questions: { en: "Before we measure — confirm these", pt: "Antes de medir — confirme isto", es: "Antes de medir — confirma esto" },
  questionsHint: {
    en: "Anything the AI couldn't be 100% sure of, it asks you instead of guessing.",
    pt: "Tudo que a IA não teve 100% de certeza, ela pergunta em vez de chutar.",
    es: "Todo lo que la IA no pudo asegurar, te lo pregunta en vez de adivinar.",
  },
  answer: { en: "Answer…", pt: "Resposta…", es: "Respuesta…" },
  saveAnswers: { en: "Save answers", pt: "Salvar respostas", es: "Guardar respuestas" },
  chosen: { en: "Taking off", pt: "Fazendo takeoff de", es: "Takeoff de" },
  scaleWarn: {
    en: "Scale not detected — confirm it in the questions for an accurate takeoff.",
    pt: "Escala não detectada — confirme nas perguntas para um takeoff preciso.",
    es: "Escala no detectada — confírmala en las preguntas para un takeoff preciso.",
  },
  intro: {
    en: "This is assisted: the AI does the first pass, you confirm. It never invents a number it isn't sure of.",
    pt: "É assistido: a IA faz o primeiro passe, você confirma. Nunca inventa número que não tem certeza.",
    es: "Es asistido: la IA hace el primer paso, tú confirmas. Nunca inventa un número que no sabe.",
  },
  next: {
    en: "Scale calibration + area measuring is the next phase — the terrain is ready.",
    pt: "Calibração de escala + medição de áreas é a próxima fase — o terreno está pronto.",
    es: "Calibración de escala + medición de áreas es la próxima fase — el terreno está listo.",
  },
} as const;

export function BlueprintDetail({ blueprint, imageUrl }: { blueprint: BlueprintRow; imageUrl: string | null }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [analyzing, setAnalyzing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(blueprint.answers ?? {});
  const a = blueprint.analysis;

  function analyze() {
    setAnalyzing(true);
    startTransition(async () => {
      const res = await analyzeBlueprint(blueprint.id);
      setAnalyzing(false);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.needsImage) toast.error(tr(L.needsImage));
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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <Link href="/blueprints" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tr(L.back)}
      </Link>

      <h1 className="text-xl font-bold">{blueprint.name}</h1>

      {/* Plan image */}
      {imageUrl && blueprint.is_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={blueprint.name} className="w-full rounded-2xl border object-contain" />
      )}

      {!a ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanSearch className="h-6 w-6" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">{tr(L.intro)}</p>
            <Button disabled={analyzing} onClick={analyze}>
              {analyzing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {analyzing ? tr(L.analyzing) : tr(L.analyze)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scope */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{tr(L.scope)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm leading-relaxed">{a.scope}</p>
              {!a.scale_detected && (
                <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <Ruler className="h-3.5 w-3.5" /> {tr(L.scaleWarn)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Trades */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{tr(L.trades)}</CardTitle>
              <p className="text-sm text-muted-foreground">{tr(L.tradesHint)}</p>
            </CardHeader>
            <CardContent className="grid gap-1.5">
              {a.trades.map((t) => {
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

          {/* Confidence-gated questions */}
          {a.questions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4 text-primary" /> {tr(L.questions)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{tr(L.questionsHint)}</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {a.questions.map((qq) => (
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
                  {tr(L.saveAnswers)}
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
            <Button variant="outline" size="sm" disabled={analyzing} onClick={analyze}>
              {analyzing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              {tr(L.reanalyze)}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
