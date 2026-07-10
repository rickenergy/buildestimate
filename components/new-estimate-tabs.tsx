"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDict } from "@/components/providers";
import { SmartWizard } from "@/components/smart-wizard";
import { QuickEstimateForm } from "@/components/quick-estimate-form";
import { AiEstimateForm } from "@/components/ai-estimate-form";
import { TypeAdvisorPanel } from "@/components/type-advisor-panel";
import { EstimateContextProvider } from "@/components/new-estimate-context";
import type { EstimateType } from "@/lib/types";
import { Sparkles, Wand2, Zap } from "lucide-react";

interface Props {
  minMarginPct: number;
  estimateType?: EstimateType | null;
  projectId?: string | null;
}

export function NewEstimateTabs({ minMarginPct, estimateType = null, projectId = null }: Props) {
  const t = useDict();
  const [materialsIncluded, setMaterialsIncluded] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ctxValue = useMemo(
    () => ({
      estimateType,
      projectId,
      materialsIncluded: estimateType ? materialsIncluded : null,
      advisorAnswers:
        estimateType && Object.keys(answers).length > 0 ? answers : null,
    }),
    [estimateType, projectId, materialsIncluded, answers]
  );

  return (
    <EstimateContextProvider value={ctxValue}>
      <main className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <h1 className="text-lg font-bold">{t.chat.title}</h1>
        </header>

        <div className="flex-1 space-y-4 px-4 py-4 pb-28">
          {estimateType && (
            <TypeAdvisorPanel
              type={estimateType}
              materialsIncluded={materialsIncluded}
              onMaterialsChange={setMaterialsIncluded}
              answers={answers}
              onAnswerChange={(id, value) =>
                setAnswers((prev) => ({ ...prev, [id]: value }))
              }
            />
          )}

          <Tabs defaultValue="ai">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai">
                <Sparkles className="mr-1 h-4 w-4" /> {t.ai.tab}
              </TabsTrigger>
              <TabsTrigger value="guided">
                <Wand2 className="mr-1 h-4 w-4" /> {t.wizard.tabGuided}
              </TabsTrigger>
              <TabsTrigger value="quick">
                <Zap className="mr-1 h-4 w-4" /> {t.wizard.tabQuick}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ai" className="mt-4">
              <AiEstimateForm minMarginPct={minMarginPct} />
            </TabsContent>
            <TabsContent value="guided" className="mt-4">
              <SmartWizard />
            </TabsContent>
            <TabsContent value="quick" className="mt-4">
              <QuickEstimateForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </EstimateContextProvider>
  );
}
