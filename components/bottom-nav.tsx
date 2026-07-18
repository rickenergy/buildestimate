"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Plus, Users, Wallet, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/components/providers";
import { NewMenu } from "@/components/new-menu";

export function BottomNav() {
  const pathname = usePathname();
  const t = useDict();

  const items = [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/estimates", label: t.nav.estimates, icon: FileText },
    { href: "__new__", label: t.nav.new, icon: Plus, primary: true },
    { href: "/finance", label: t.nav.finance, icon: Wallet },
    { href: "/clients", label: t.nav.clients, icon: Users },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around md:max-w-2xl">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active =
            pathname.startsWith(href);
          if (primary) {
            return <NewMenu key={href} label={label} />;
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press flex min-w-14 flex-col items-center gap-0.5 px-3 py-2 text-muted-foreground transition-colors",
                active && "font-semibold text-primary"
              )}
              aria-label={label}
            >
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
