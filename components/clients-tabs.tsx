"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDict } from "@/components/providers";
import { Kanban, List } from "lucide-react";

export function ClientsTabs({
  kanban,
  list,
}: {
  kanban: React.ReactNode;
  list: React.ReactNode;
}) {
  const t = useDict();
  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t.clients.title}</h1>
      </header>
      <Tabs defaultValue="kanban">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kanban">
            <Kanban className="mr-1 h-4 w-4" /> {t.crm.kanban}
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-1 h-4 w-4" /> {t.crm.list}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          {kanban}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          {list}
        </TabsContent>
      </Tabs>
    </main>
  );
}
