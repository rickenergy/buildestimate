"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDict } from "@/components/providers";
import { createProject } from "@/app/actions/projects";
import type { ProjectType } from "@/lib/types";
import { Home, Building2, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES: { value: ProjectType; icon: typeof Home }[] = [
  { value: "residential", icon: Home },
  { value: "commercial", icon: Building2 },
  { value: "mixed", icon: Layers },
];

export function ProjectForm({ defaultType }: { defaultType?: ProjectType }) {
  const t = useDict();
  const nf = t.newflow;
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>(defaultType ?? "residential");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createProject({
          name,
          project_type: type,
          client_name: clientName || undefined,
          address: address || undefined,
          description: description || undefined,
        });
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 pb-28">
      <h1 className="mb-4 text-lg font-bold">{nf.newProjectTitle}</h1>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{nf.projectDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label>{nf.projectName}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={nf.projectNamePlaceholder}
                autoFocus
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{nf.projectType}</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition",
                      type === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {nf.projectTypes[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{nf.client}</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={nf.clientPlaceholder}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{nf.address}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={nf.addressPlaceholder}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{nf.description}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={nf.descriptionPlaceholder}
                className="min-h-[70px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                nf.createProject
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
