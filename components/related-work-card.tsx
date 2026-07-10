"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDict } from "@/components/providers";
import { getAdjacent } from "@/lib/standards";

/**
 * "Related work to propose" — turns one job into a full scope. Reads the
 * adjacency map (lib/standards) for the estimate's trade and surfaces the
 * attached problems/opportunities a contractor should raise with the client.
 */
export function RelatedWorkCard({ trade }: { trade: string }) {
  const t = useDict();
  const items = getAdjacent(trade);
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t.related.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{t.related.subtitle}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((a) => (
          <div key={a.trade} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{t.trades[a.trade] ?? a.trade}</span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs " +
                  (a.weight === "often"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400")
                }
              >
                {a.weight === "often" ? t.related.often : t.related.check}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.why}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
