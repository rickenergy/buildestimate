"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useLang } from "@/components/providers";
import { GUIDE_UI, type GLang } from "@/lib/glossary";

/** Always-available help button → /guide. Sits above the bottom nav. */
export function GuideFab() {
  const lang = useLang() as GLang;
  const pathname = usePathname();
  if (pathname.startsWith("/guide")) return null;

  return (
    <Link
      href="/guide"
      aria-label={GUIDE_UI[lang].open}
      className="fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-background text-primary shadow-lg transition hover:scale-105 hover:bg-primary hover:text-primary-foreground md:right-[max(1rem,calc(50%-20rem))]"
    >
      <HelpCircle className="h-5 w-5" />
    </Link>
  );
}
