"use client";

import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useDict } from "@/components/providers";
import { cn } from "@/lib/utils";
import type { Light } from "@/lib/alerts";

/** Status semaphore — always icon + label, never color alone. */
export function TrafficLight({ light, compact }: { light: Light; compact?: boolean }) {
  const t = useDict();
  const map = {
    green: { icon: CheckCircle2, cls: "text-green-600 dark:text-green-400", label: t.alerts.onTrack },
    yellow: { icon: AlertTriangle, cls: "text-amber-500", label: t.alerts.attention },
    red: { icon: AlertCircle, cls: "text-red-500", label: t.alerts.incident },
  } as const;
  const { icon: Icon, cls, label } = map[light];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && label}
    </span>
  );
}
