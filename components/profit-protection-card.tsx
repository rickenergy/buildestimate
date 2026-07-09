"use client";

import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  cost: number;
  price: number;
  minMarginPct: number;
}

/** Profit Protection Mode — warns when projected margin is under the target. */
export function ProfitProtectionCard({ cost, price, minMarginPct }: Props) {
  const t = useDict();
  const lang = useLang();

  if (price <= 0) return null;
  const marginPct = Math.round(((price - cost) / price) * 100);
  const ok = marginPct >= minMarginPct;
  const suggested = Math.ceil(cost / (1 - minMarginPct / 100));

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
        ok
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      )}
    >
      {ok ? (
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p className="font-semibold">{t.profit.title}</p>
        <p>
          {ok
            ? t.profit.ok.replace("{margin}", String(marginPct))
            : t.profit.low
                .replace("{margin}", String(marginPct))
                .replace("{min}", String(minMarginPct))
                .replace("{price}", formatMoney(suggested, lang))}
        </p>
      </div>
    </div>
  );
}
