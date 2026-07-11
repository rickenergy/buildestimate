"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useDict } from "@/components/providers";
import { createProject, updateProject } from "@/app/actions/projects";
import type { Project, ProjectType } from "@/lib/types";
import { Home, Building2, Layers, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES: { value: ProjectType; icon: typeof Home }[] = [
  { value: "residential", icon: Home },
  { value: "commercial", icon: Building2 },
  { value: "mixed", icon: Layers },
];

export function ProjectForm({
  defaultType,
  project,
}: {
  defaultType?: ProjectType;
  project?: Project;
}) {
  const t = useDict();
  const nf = t.newflow;
  const editing = !!project;
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(project?.name ?? "");
  const [type, setType] = useState<ProjectType>(project?.project_type ?? defaultType ?? "residential");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState(project?.address ?? "");
  const [city, setCity] = useState(project?.city ?? "");
  const [stateCode, setStateCode] = useState(project?.state ?? "");
  const [zip, setZip] = useState(project?.zip ?? "");
  const [description, setDescription] = useState(project?.description ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        const input = {
          name,
          project_type: type,
          client_name: clientName || undefined,
          address: address || undefined,
          city: city || undefined,
          state: stateCode || undefined,
          zip: zip || undefined,
          description: description || undefined,
        };
        if (editing) await updateProject(project!.id, input);
        else await createProject(input);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  return (
    <div className="pb-28">
      <PageHeader
        title={editing ? nf.editProject : nf.newProjectTitle}
        backHref={editing ? `/project/${project!.id}` : "/projects"}
      />
      <div className="mx-auto max-w-2xl px-4 py-4">
        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{nf.projectDetails}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>{nf.projectName}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={nf.projectNamePlaceholder}
                  autoFocus={!editing}
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
                        "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold transition active:scale-95",
                        type === value
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/40"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{nf.address}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">{nf.addressLine}</Label>
                <AddressAutocomplete
                  value={address}
                  placeholder={nf.addressPlaceholder}
                  onChange={(full, parts) => {
                    setAddress(full);
                    if (parts) {
                      setCity(parts.city);
                      setStateCode(parts.state);
                      setZip(parts.zip);
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3 grid gap-1.5">
                  <Label className="text-xs">{nf.city}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="col-span-1 grid gap-1.5">
                  <Label className="text-xs">{nf.state}</Label>
                  <Input value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} maxLength={2} />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-xs">{nf.zip}</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{nf.addressAutofillHint}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-1.5">
                <Label>{nf.description}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={nf.descriptionPlaceholder}
                  className="min-h-[70px]"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base font-semibold shadow-md active:scale-[0.99]"
            disabled={pending || !name.trim()}
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-5 w-5" />
                {editing ? nf.saveChanges : nf.createProject}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
