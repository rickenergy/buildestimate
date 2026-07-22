"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInput } from "@/components/voice-input";
import { useLang } from "@/components/providers";
import { saveBuilderRequest } from "@/app/actions/blueprints";

const L = {
  title: { en: "What did the builder ask for?", pt: "O que o construtor pediu?", es: "¿Qué pidió el constructor?" },
  hint: {
    en: "Describe the job in plain words — the scope and quantities are built to match this exactly.",
    pt: "Descreva o trabalho em palavras simples — o escopo e as quantidades saem exatamente disso.",
    es: "Describa el trabajo en palabras simples — el alcance y las cantidades se ajustan a esto.",
  },
  placeholder: {
    en: "e.g. Paint all bedrooms and the bathroom, walls and ceilings, 2 coats.",
    pt: "ex. Pintar todos os quartos e o banheiro, paredes e tetos, 2 demãos.",
    es: "ej. Pintar todas las habitaciones y el baño, paredes y techos, 2 manos.",
  },
  save: { en: "Save", pt: "Salvar", es: "Guardar" },
};

/**
 * Self-contained so typing lives in local state and never re-renders the big
 * blueprint-detail tree (was the source of a ~375ms INP on every keystroke).
 * The value is lifted only on Save.
 */
export function BuilderRequestCard({ blueprintId, initialValue }: { blueprintId: string; initialValue: string }) {
  const lang = useLang();
  const tr = (m: Record<string, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [text, setText] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await saveBuilderRequest(blueprintId, text.trim());
      router.refresh();
      toast.success("✓");
    });
  }

  return (
    <Card>
      <CardContent className="grid gap-2 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" /> {tr(L.title)}
        </p>
        <p className="text-xs text-muted-foreground">{tr(L.hint)}</p>
        <div className="flex items-start gap-1.5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr(L.placeholder)}
            className="min-h-20"
          />
          <VoiceInput onTranscript={(t) => setText((s) => (s.trim() ? `${s.trim()} ` : "") + t)} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" disabled={pending} onClick={save}>
            {tr(L.save)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
