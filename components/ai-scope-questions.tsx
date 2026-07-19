"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import { VoiceInput } from "@/components/voice-input";
import { generateScopeQuestions, saveScopeAnswers, type ScopeQuestion } from "@/app/actions/scope-advisor";
import { MessagesSquare, Sparkles, Loader2, Save } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "AI scope advisor", pt: "Consultor de escopo (IA)", es: "Asesor de alcance (IA)" },
  subtitle: {
    en: "AI reads this job and asks what a sharp estimator would — answer by voice or text.",
    pt: "A IA lê este serviço e pergunta o que um bom orçamentista perguntaria — responda por voz ou texto.",
    es: "La IA lee este trabajo y pregunta lo que un buen estimador preguntaría — responde por voz o texto.",
  },
  generate: { en: "Generate questions", pt: "Gerar perguntas", es: "Generar preguntas" },
  regenerate: { en: "Regenerate", pt: "Gerar de novo", es: "Regenerar" },
  save: { en: "Save answers", pt: "Salvar respostas", es: "Guardar respuestas" },
  needsKey: {
    en: "AI key not configured (AI_GATEWAY_API_KEY).",
    pt: "Chave de IA não configurada (AI_GATEWAY_API_KEY).",
    es: "Clave de IA no configurada (AI_GATEWAY_API_KEY).",
  },
  saved: { en: "Answers saved.", pt: "Respostas salvas.", es: "Respuestas guardadas." },
  answer: { en: "Answer…", pt: "Resposta…", es: "Respuesta…" },
} as const;

export function AiScopeQuestions({
  estimateId,
  trade,
  context,
  initialAnswers,
}: {
  estimateId: string;
  trade: string;
  context: string;
  initialAnswers?: Record<string, string>;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<ScopeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await generateScopeQuestions(trade, context);
      if (res.needsKey) toast.error(tr(L.needsKey));
      else if (res.ok && res.questions) setQuestions(res.questions);
      else toast.error(res.error ?? "Error");
    } finally {
      setGenerating(false);
    }
  }

  function setAnswer(key: string, val: string) {
    setAnswers((a) => ({ ...a, [key]: val }));
  }

  function save() {
    startTransition(async () => {
      await saveScopeAnswers(estimateId, answers);
      router.refresh();
      toast.success(tr(L.saved));
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-primary" />
          {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {questions.map((item, i) => {
          const key = `ai_${i}`;
          return (
            <div key={key} className="grid gap-1.5 rounded-lg border p-3">
              <p className="text-sm font-medium">{item.q}</p>
              <p className="text-xs text-muted-foreground">{item.why}</p>
              <div className="flex items-center gap-1.5">
                <Input
                  value={answers[key] ?? ""}
                  onChange={(e) => setAnswer(key, e.target.value)}
                  placeholder={tr(L.answer)}
                  className="h-9"
                />
                <VoiceInput
                  onTranscript={(text) =>
                    setAnswer(key, (answers[key]?.trim() ? `${answers[key].trim()} ` : "") + text)
                  }
                />
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={generating} onClick={generate}>
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {questions.length > 0 ? tr(L.regenerate) : tr(L.generate)}
          </Button>
          {questions.length > 0 && (
            <Button size="sm" className="flex-1" disabled={pending} onClick={save}>
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {tr(L.save)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
