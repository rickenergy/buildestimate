"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDict } from "@/components/providers";
import { SmartWizard } from "@/components/smart-wizard";
import { QuickEstimateForm } from "@/components/quick-estimate-form";
import { Sparkles, Wand2, Zap } from "lucide-react";

export default function NewEstimatePage() {
  const t = useDict();

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">{t.chat.title}</h1>
      </header>

      <div className="flex-1 space-y-4 px-4 py-4 pb-28">
        <div className="flex items-center gap-2 rounded-xl border border-dashed bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          {t.form.aiSoon}
        </div>

        <Tabs defaultValue="guided">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guided">
              <Wand2 className="mr-1 h-4 w-4" /> {t.wizard.tabGuided}
            </TabsTrigger>
            <TabsTrigger value="quick">
              <Zap className="mr-1 h-4 w-4" /> {t.wizard.tabQuick}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="guided" className="mt-4">
            <SmartWizard />
          </TabsContent>
          <TabsContent value="quick" className="mt-4">
            <QuickEstimateForm />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
