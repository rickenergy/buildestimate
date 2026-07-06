"use client";

import { Badge } from "@/components/ui/badge";
import { useDict } from "@/components/providers";
import { cn } from "@/lib/utils";

const ESTIMATE_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  sent: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const CLIENT_STYLES: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  estimate_sent: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  follow_up: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function EstimateStatusBadge({ status }: { status: string }) {
  const t = useDict();
  const label = t.estimate.status[status as keyof typeof t.estimate.status] ?? status;
  return <Badge className={cn("border-0", ESTIMATE_STYLES[status])}>{label}</Badge>;
}

export function ClientStatusBadge({ status }: { status: string }) {
  const t = useDict();
  const label = t.clients.status[status as keyof typeof t.clients.status] ?? status;
  return <Badge className={cn("border-0", CLIENT_STYLES[status])}>{label}</Badge>;
}
