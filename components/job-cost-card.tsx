"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { addTransaction } from "@/app/actions/finance";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type JobTransaction,
  type TransactionKind,
} from "@/lib/finance";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  estimateId: string;
  contractTotal: number;
  estimatedCost: number; // material + labor + demo from the takeoff
  transactions: JobTransaction[];
}

export function JobCostCard({ estimateId, contractTotal, estimatedCost, transactions }: Props) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [category, setCategory] = useState("materials");
  const [amount, setAmount] = useState("");

  const { received, spent } = useMemo(() => {
    let received = 0;
    let spent = 0;
    for (const tx of transactions) {
      if (tx.kind === "income") received += Number(tx.amount);
      else spent += Number(tx.amount);
    }
    return { received, spent };
  }, [transactions]);

  const outstanding = Math.max(0, contractTotal - received);
  const realProfit = received - spent;
  const projectedProfit = contractTotal - spent;

  function pickKind(k: TransactionKind) {
    setKind(k);
    setCategory(k === "income" ? "deposit" : "materials");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error(t.finance.invalidAmount);
      return;
    }
    startTransition(async () => {
      try {
        await addTransaction({ kind, category, amount: value, estimate_id: estimateId });
        setAmount("");
        toast.success(t.finance.added);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catLabel = (c: string) => t.finance.categories[c] ?? c;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Wallet className="h-4 w-4 text-primary" /> {t.finance.jobCostTitle}
          </CardTitle>
          <Button asChild size="sm" variant="ghost" className="text-xs">
            <Link href="/finance">{t.finance.seeAll}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <Row label={t.finance.contract} value={formatMoney(contractTotal, lang)} />
          <Row label={t.finance.received} value={formatMoney(received, lang)} strongValue />
          <Row label={t.finance.outstanding} value={formatMoney(outstanding, lang)} />
        </div>

        <Separator />

        <div className="space-y-1">
          <Row label={t.finance.estCost} value={formatMoney(estimatedCost, lang)} />
          <Row
            label={t.finance.actualSpent}
            value={formatMoney(spent, lang)}
            valueClass={spent > estimatedCost ? "text-red-500 font-semibold" : undefined}
          />
          <Row
            label={t.finance.projectedProfit}
            value={formatMoney(projectedProfit, lang)}
            valueClass={projectedProfit < 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}
          />
          <Row
            label={t.finance.realProfit}
            value={formatMoney(realProfit, lang)}
            valueClass={realProfit < 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}
          />
        </div>

        <Separator />

        {/* quick add */}
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              className="h-9 w-9"
              variant={kind === "expense" ? "default" : "outline"}
              aria-label={t.finance.expense}
              onClick={() => pickKind("expense")}
            >
              <ArrowDownCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-9 w-9"
              variant={kind === "income" ? "default" : "outline"}
              aria-label={t.finance.incomeOne}
              onClick={() => pickKind("income")}
            >
              <ArrowUpCircle className="h-4 w-4" />
            </Button>
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {catLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="h-9 w-24 flex-1"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strongValue,
  valueClass,
}: {
  label: string;
  value: string;
  strongValue?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strongValue && "font-semibold", valueClass)}>{value}</span>
    </div>
  );
}
