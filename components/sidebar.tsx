"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useDict, useLang } from "@/components/providers";
import { NewMenu } from "@/components/new-menu";
import {
  Home,
  FileText,
  Wallet,
  Users,
  Settings,
  Plus,
  Layers,
  Map,
  MapPin,
  TriangleAlert,
  HardHat,
  Truck,
  User,
  Store,
  Package,
  Boxes,
  BookOpen,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "en" | "pt" | "es";

const REG = {
  manage: { en: "Manage", pt: "Gerenciar", es: "Gestionar" },
  network: { en: "Network", pt: "Rede", es: "Red" },
} as const;

export function Sidebar({ memberMode = false }: { memberMode?: boolean }) {
  const t = useDict();
  const lang = useLang() as Lang;
  const trm = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const pathname = usePathname();
  const [manageOpen, setManageOpen] = useState(true);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Team members get a focused sidebar: their work + settings, no owner tools.
  if (memberMode) {
    return (
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card/60 backdrop-blur md:flex">
        <Link href="/home" className="flex items-center gap-2 px-5 py-5">
          <Image src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-sm font-bold leading-tight">ContractorOS AI</span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          <SideLink href="/home" label={t.nav.home} Icon={Home} active={active("/home")} />
        </nav>
        <div className="space-y-0.5 border-t px-3 py-3">
          <SideLink href="/settings" label={t.nav.settings} Icon={Settings} active={active("/settings")} />
        </div>
      </aside>
    );
  }

  const main = [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/estimates", label: t.nav.estimates, icon: FileText },
    { href: "/finance", label: t.nav.finance, icon: Wallet },
    { href: "/clients", label: t.nav.clients, icon: Users },
  ];

  const manage = [
    { href: "/projects", label: t.newflow.projectsTitle, icon: Layers },
    { href: "/blueprints", label: lang === "pt" ? "Plantas" : lang === "es" ? "Planos" : "Blueprints", icon: Map },
    { href: "/demand", label: t.demand.title, icon: MapPin },
    { href: "/incidents", label: lang === "pt" ? "Incidentes" : lang === "es" ? "Incidentes" : "Incidents", icon: TriangleAlert },
    { href: "/prices", label: t.prices.title, icon: BookOpen },
    { href: "/materials", label: lang === "pt" ? "Guia de material" : lang === "es" ? "Guía de material" : "Material guide", icon: Boxes },
    { href: "/subcontractors", label: lang === "pt" ? "Subcontratados" : lang === "es" ? "Subcontratistas" : "Subcontractors", icon: HardHat },
    { href: "/suppliers", label: lang === "pt" ? "Fornecedores" : lang === "es" ? "Proveedores" : "Suppliers", icon: Truck },
    { href: "/employees", label: lang === "pt" ? "Funcionários" : lang === "es" ? "Empleados" : "Employees", icon: User },
    { href: "/retail-stores", label: lang === "pt" ? "Lojas" : lang === "es" ? "Tiendas" : "Stores", icon: Store },
    { href: "/inventory", label: lang === "pt" ? "Estoque" : lang === "es" ? "Inventario" : "Inventory", icon: Package },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card/60 backdrop-blur md:flex">
      {/* brand */}
      <Link href="/home" className="flex items-center gap-2 px-5 py-5">
        <Image src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
        <span className="text-sm font-bold leading-tight">ContractorOS AI</span>
      </Link>

      {/* new */}
      <div className="px-3 pb-2">
        <NewMenu
          label={t.nav.new}
          trigger={
            <button className="press flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/75 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25">
              <Plus className="h-4 w-4" /> {t.dashboard.newEstimate}
            </button>
          }
        />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {main.map(({ href, label, icon: Icon }) => (
          <SideLink key={href} href={href} label={label} Icon={Icon} active={active(href)} />
        ))}

        {/* manage section */}
        <button
          onClick={() => setManageOpen((v) => !v)}
          className="mt-3 flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {trm(REG.manage)}
          <ChevronDown className={cn("h-3.5 w-3.5 transition", manageOpen && "rotate-180")} />
        </button>
        {manageOpen &&
          manage.map(({ href, label, icon: Icon }) => (
            <SideLink key={href} href={href} label={label} Icon={Icon} active={active(href)} small />
          ))}
      </nav>

      {/* footer */}
      <div className="space-y-0.5 border-t px-3 py-3">
        <SideLink href="/guide" label={lang === "pt" ? "Guia" : lang === "es" ? "Guía" : "Guide"} Icon={HelpCircle} active={active("/guide")} />
        <SideLink href="/settings" label={t.nav.settings} Icon={Settings} active={active("/settings")} />
      </div>
    </aside>
  );
}

function SideLink({
  href,
  label,
  Icon,
  active,
  small,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
        small ? "py-1.5" : "py-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("shrink-0", small ? "h-4 w-4" : "h-5 w-5")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
