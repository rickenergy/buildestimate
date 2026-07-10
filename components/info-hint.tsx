"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLang } from "@/components/providers";
import { glossaryById, GUIDE_UI, type GLang } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * Inline ⓘ that explains a piece of jargon in plain language, in the user's
 * language. Pass a glossary entry id: <InfoHint id="win_rate" />.
 */
export function InfoHint({ id, className }: { id: string; className?: string }) {
  const lang = useLang() as GLang;
  const entry = glossaryById(id);
  if (!entry) return null;
  const ui = GUIDE_UI[lang];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={entry.term[lang]}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex align-middle text-muted-foreground/70 transition hover:text-primary",
            className
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">{entry.term[lang]}</p>
        <p className="text-xs text-muted-foreground">{entry.short[lang]}</p>
        {entry.long && (
          <p className="text-xs text-muted-foreground">{entry.long[lang]}</p>
        )}
        <Link
          href="/guide"
          className="inline-block pt-0.5 text-xs text-primary hover:underline"
        >
          {ui.open} →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
