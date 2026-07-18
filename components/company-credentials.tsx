"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addCompanyLicense,
  deleteCompanyLicense,
  addCompanyInsurance,
  deleteCompanyInsurance,
} from "@/app/actions/network";
import { useLang } from "@/components/providers";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import type { CompanyLicense, CompanyInsurance } from "@/lib/types";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Licenses & insurance", pt: "Licenças & seguro", es: "Licencias y seguro" },
  hint: {
    en: "Required info shown on every estimate and proposal footer.",
    pt: "Info exigida, aparece no rodapé de todo estimate e proposta.",
    es: "Info requerida, aparece en el pie de cada propuesta.",
  },
  licenses: { en: "Licenses", pt: "Licenças", es: "Licencias" },
  insurances: { en: "Insurance", pt: "Seguros", es: "Seguros" },
  type: { en: "Type", pt: "Tipo", es: "Tipo" },
  number: { en: "License #", pt: "Nº licença", es: "Nº licencia" },
  state: { en: "State", pt: "Estado", es: "Estado" },
  provider: { en: "Provider", pt: "Seguradora", es: "Aseguradora" },
  policy: { en: "Policy #", pt: "Nº apólice", es: "Nº póliza" },
  coverage: { en: "Coverage $", pt: "Cobertura $", es: "Cobertura $" },
  add: { en: "Add", pt: "Adicionar", es: "Agregar" },
} as const;

export function CompanyCredentials({
  licenses,
  insurances,
}: {
  licenses: CompanyLicense[];
  insurances: CompanyInsurance[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [lic, setLic] = useState({ license_type: "", license_number: "", state: "" });
  const [ins, setIns] = useState({ provider: "", policy_number: "", coverage_amount: "" });

  function addLicense() {
    if (!lic.license_number.trim()) return;
    startTransition(async () => {
      await addCompanyLicense(lic);
      setLic({ license_type: "", license_number: "", state: "" });
      router.refresh();
    });
  }
  function addInsurance() {
    startTransition(async () => {
      await addCompanyInsurance({ ...ins, coverage_amount: ins.coverage_amount ? Number(ins.coverage_amount) : null });
      setIns({ provider: "", policy_number: "", coverage_amount: "" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{tr(L.hint)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* licenses */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{tr(L.licenses)}</p>
          {licenses.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {l.license_type ? `${l.license_type} · ` : ""}#{l.license_number}
                {l.state ? ` (${l.state})` : ""}
              </span>
              <button
                onClick={() => startTransition(async () => { await deleteCompanyLicense(l.id); router.refresh(); })}
                className="shrink-0 text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder={tr(L.type)} value={lic.license_type} onChange={(e) => setLic((f) => ({ ...f, license_type: e.target.value }))} className="h-8 text-xs" />
            <Input placeholder={tr(L.number)} value={lic.license_number} onChange={(e) => setLic((f) => ({ ...f, license_number: e.target.value }))} className="h-8 text-xs" />
            <Input placeholder={tr(L.state)} value={lic.state} onChange={(e) => setLic((f) => ({ ...f, state: e.target.value }))} className="h-8 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={addLicense} disabled={!lic.license_number.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {tr(L.add)}
          </Button>
        </div>

        {/* insurances */}
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{tr(L.insurances)}</p>
          {insurances.map((ins2) => (
            <div key={ins2.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {ins2.provider ?? "—"} {ins2.policy_number ? `#${ins2.policy_number}` : ""}
                {ins2.coverage_amount ? ` · $${Number(ins2.coverage_amount).toLocaleString()}` : ""}
              </span>
              <button
                onClick={() => startTransition(async () => { await deleteCompanyInsurance(ins2.id); router.refresh(); })}
                className="shrink-0 text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder={tr(L.provider)} value={ins.provider} onChange={(e) => setIns((f) => ({ ...f, provider: e.target.value }))} className="h-8 text-xs" />
            <Input placeholder={tr(L.policy)} value={ins.policy_number} onChange={(e) => setIns((f) => ({ ...f, policy_number: e.target.value }))} className="h-8 text-xs" />
            <Input type="number" placeholder={tr(L.coverage)} value={ins.coverage_amount} onChange={(e) => setIns((f) => ({ ...f, coverage_amount: e.target.value }))} className="h-8 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={addInsurance}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {tr(L.add)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
