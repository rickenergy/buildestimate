"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import {
  createChangeOrder,
  setChangeOrderStatus,
  deleteChangeOrder,
  createInvoice,
  markInvoicePaid,
  voidInvoice,
  createPaymentLink,
  type ChangeOrder,
  type Invoice,
} from "@/app/actions/billing";
import {
  Receipt,
  FilePlus2,
  Check,
  X,
  Link2,
  Loader2,
  Plus,
  Trash2,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  contractTotal: number;
  invoices: Invoice[];
  changeOrders: ChangeOrder[];
}

const INV_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  void: "bg-muted text-muted-foreground",
};

export function BillingCard({ estimateId, contractTotal, invoices, changeOrders }: Props) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();

  const [invLabel, setInvLabel] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [coDesc, setCoDesc] = useState("");
  const [coAmount, setCoAmount] = useState("");

  const money = (n: number) => formatMoney(n, lang);
  const approvedCo = changeOrders
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(invAmount);
    if (!(value > 0)) return;
    startTransition(async () => {
      try {
        await createInvoice(estimateId, invLabel, value);
        setInvLabel("");
        setInvAmount("");
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  function addCo(e: React.FormEvent) {
    e.preventDefault();
    if (!coDesc.trim()) return;
    startTransition(async () => {
      try {
        await createChangeOrder(estimateId, coDesc, Number(coAmount) || 0);
        setCoDesc("");
        setCoAmount("");
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  function payLink(inv: Invoice) {
    startTransition(async () => {
      const res = await createPaymentLink(inv.id, estimateId);
      if (res.ok && res.url) {
        await navigator.clipboard.writeText(res.url).catch(() => {});
        window.open(res.url, "_blank", "noopener");
      } else if (res.needsStripe) {
        toast.info(t.billing.needsStripe);
      } else {
        toast.error(res.error ?? t.common.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Receipt className="h-4 w-4 text-primary" /> {t.billing.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* invoices */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t.billing.invoices}
          </p>
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  #{inv.number} · {inv.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{money(Number(inv.amount))}</p>
              </div>
              <Badge className={cn("text-[10px]", INV_BADGE[inv.status])}>
                {t.billing.invStatus[inv.status]}
              </Badge>
              {inv.status === "unpaid" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={t.billing.paymentLink}
                    onClick={() => payLink(inv)}
                    disabled={pending}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600"
                    aria-label={t.billing.markPaid}
                    onClick={() =>
                      startTransition(async () => markInvoicePaid(inv.id, estimateId))
                    }
                    disabled={pending}
                  >
                    <CircleDollarSign className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={t.billing.void}
                    onClick={() => startTransition(async () => voidInvoice(inv.id, estimateId))}
                    disabled={pending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
          <form onSubmit={addInvoice} className="flex items-end gap-2">
            <Input
              value={invLabel}
              onChange={(e) => setInvLabel(e.target.value)}
              placeholder={t.billing.invoicePlaceholder}
              className="h-9 flex-1"
            />
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={invAmount}
              onChange={(e) => setInvAmount(e.target.value)}
              placeholder="0.00"
              className="h-9 w-24"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={pending || !(Number(invAmount) > 0)}
              aria-label={t.billing.newInvoice}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
          <div className="flex gap-2">
            {[
              { pct: 40, label: `${t.analysis.deposit} 40%` },
              { pct: 20, label: "20%" },
            ].map(({ pct, label }) => (
              <Button
                key={pct}
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={pending}
                onClick={() =>
                  startTransition(async () =>
                    createInvoice(
                      estimateId,
                      label,
                      Math.round(contractTotal * pct) / 100
                    )
                  )
                }
              >
                <FilePlus2 className="mr-1 h-3.5 w-3.5" /> {label} ·{" "}
                {money((contractTotal * pct) / 100)}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        {/* change orders */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t.billing.changeOrders}
          </p>
          {changeOrders.map((co) => (
            <div key={co.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{co.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  {money(Number(co.amount))} · {t.billing.coStatus[co.status]}
                </p>
              </div>
              {co.status === "pending" ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600"
                    aria-label={t.billing.approve}
                    onClick={() =>
                      startTransition(async () =>
                        setChangeOrderStatus(co.id, estimateId, "approved")
                      )
                    }
                    disabled={pending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500"
                    aria-label={t.billing.decline}
                    onClick={() =>
                      startTransition(async () =>
                        setChangeOrderStatus(co.id, estimateId, "declined")
                      )
                    }
                    disabled={pending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={t.common.delete}
                  onClick={() =>
                    startTransition(async () => deleteChangeOrder(co.id, estimateId))
                  }
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <form onSubmit={addCo} className="flex items-end gap-2">
            <Input
              value={coDesc}
              onChange={(e) => setCoDesc(e.target.value)}
              placeholder={t.billing.coPlaceholder}
              className="h-9 flex-1"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={coAmount}
              onChange={(e) => setCoAmount(e.target.value)}
              placeholder="0.00"
              className="h-9 w-24"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={pending || !coDesc.trim()}
              aria-label={t.billing.newCo}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          {approvedCo > 0 && (
            <div className="flex justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold">
              <span>{t.billing.totalWithCo}</span>
              <span>{money(contractTotal + approvedCo)}</span>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
