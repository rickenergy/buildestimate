"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Plus, Users, Wallet, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/components/providers";

export function BottomNav() {
  const pathname = usePathname();
  const t = useDict();

  const items = [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/estimates", label: t.nav.estimates, icon: FileText },
    { href: "/estimate/new", label: t.nav.new, icon: Plus, primary: true },
    { href: "/finance", label: t.nav.finance, icon: Wallet },
    { href: "/clients", label: t.nav.clients, icon: Users },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around md:max-w-2xl">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active =
            pathname.startsWith(href);
          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-2"
                aria-label={label}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-5">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-14 flex-col items-center gap-0.5 px-3 py-2 text-muted-foreground",
                active && "text-primary"
              )}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
