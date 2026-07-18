"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDict, useLang } from "@/components/providers";
import { Home, Building2, FolderPlus, Plus, ChevronRight, Users, Truck, HardHat, User, Store } from "lucide-react";

const REG = {
  section: { en: "Register", pt: "Cadastros", es: "Registros" },
  client: { en: "Client", pt: "Cliente", es: "Cliente" },
  supplier: { en: "Supplier", pt: "Fornecedor", es: "Proveedor" },
  sub: { en: "Subcontractor", pt: "Subcontratado", es: "Subcontratista" },
  employee: { en: "Employee", pt: "Funcionário", es: "Empleado" },
  store: { en: "Retail store", pt: "Loja varejista", es: "Tienda" },
} as const;

export function NewMenu({ label, trigger }: { label: string; trigger?: React.ReactNode }) {
  const t = useDict();
  const lang = useLang() as "en" | "pt" | "es";
  const trm = (m: Record<"en" | "pt" | "es", string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nf = t.newflow;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const options = [
    {
      icon: <Home className="h-5 w-5" />,
      title: nf.startResidential,
      desc: nf.startResidentialDesc,
      href: "/estimate/new?type=residential",
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      title: nf.startCommercial,
      desc: nf.startCommercialDesc,
      href: "/estimate/new?type=commercial",
    },
    {
      icon: <FolderPlus className="h-5 w-5" />,
      title: nf.startProject,
      desc: nf.startProjectDesc,
      href: "/project/new",
    },
  ];

  const registers = [
    { icon: <Users className="h-4 w-4" />, title: trm(REG.client), href: "/clients" },
    { icon: <Truck className="h-4 w-4" />, title: trm(REG.supplier), href: "/suppliers" },
    { icon: <HardHat className="h-4 w-4" />, title: trm(REG.sub), href: "/subcontractors" },
    { icon: <User className="h-4 w-4" />, title: trm(REG.employee), href: "/employees" },
    { icon: <Store className="h-4 w-4" />, title: trm(REG.store), href: "/retail-stores" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 px-3 py-2"
            aria-label={label}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-5">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{nf.chooseTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.href}
              type="button"
              onClick={() => go(o.href)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {o.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-muted-foreground">{o.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}

          {/* Registers — clients, suppliers, subs, employees, stores */}
          <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {trm(REG.section)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {registers.map((r) => (
              <button
                key={r.href}
                type="button"
                onClick={() => go(r.href)}
                className="flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition hover:border-primary hover:bg-primary/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
