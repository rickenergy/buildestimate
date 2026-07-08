"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import {
  addTransaction,
  deleteTransaction,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type JobTransaction,
  type TransactionKind,
} from "@/app/actions/finance";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  transactions: JobTransaction[];
  estimates: { id: string; title: string }[];
}

export function FinanceManager({ transactions, estimates }: Props) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [category, setCategory] = useState<string>("materials");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [estimateId, setEstimateId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.kind === "income") income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
        await addTransaction({
          kind,
          category,
          amount: value,
          description: description || undefined,
          occurred_at: date,
          estimate_id: estimateId || null,
        });
        setAmount("");
        setDescription("");
        toast.success(t.finance.added);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  // group by date
  const byDate = useMemo(() => {
    const groups = new Map<string, JobTransaction[]>();
    for (const tx of transactions) {
      const list = groups.get(tx.occurred_at) ?? [];
      list.push(tx);
      groups.set(tx.occurred_at, list);
    }
    return [...groups.entries()];
  }, [transactions]);

  const catLabel = (c: string) => t.finance.categories[c] ?? c;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t.finance.title}</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> {t.finance.add}
        </Button>
      </header>

      {/* summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
            <span className="text-[10px] uppercase text-muted-foreground">
              {t.finance.income}
            </span>
            <span className="text-sm font-bold">{formatMoney(totals.income, lang)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
            <span className="text-[10px] uppercase text-muted-foreground">
              {t.finance.expenses}
            </span>
            <span className="text-sm font-bold">{formatMoney(totals.expense, lang)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase text-muted-foreground">
              {t.finance.balance}
            </span>
            <span
              className={cn(
                "text-sm font-bold",
                totals.net < 0 ? "text-red-500" : "text-green-600"
              )}
            >
              {formatMoney(totals.net, lang)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* add form */}
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant={kind === "expense" ? "default" : "outline"}
                  onClick={() => pickKind("expense")}
                >
                  <ArrowDownCircle className="mr-1 h-4 w-4" /> {t.finance.expense}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={kind === "income" ? "default" : "outline"}
                  onClick={() => pickKind("income")}
                >
                  <ArrowUpCircle className="mr-1 h-4 w-4" /> {t.finance.incomeOne}
                </Button>
              </div>

              <div className="grid gap-1.5">
                <Label>{t.finance.category}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
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
              </div>

              <div className="grid gap-1.5">
                <Label>{t.finance.amount}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>{t.finance.date}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label>{t.finance.linkedJob}</Label>
                <Select
                  value={estimateId || "__none__"}
                  onValueChange={(v) => setEstimateId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t.finance.noJob}</SelectItem>
                    {estimates.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 md:col-span-2">
                <Label>{t.finance.description}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.finance.descriptionPlaceholder}
                />
              </div>

              <Button type="submit" disabled={pending} className="md:col-span-2">
                {pending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                {t.finance.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* list */}
      {transactions.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t.finance.empty}</p>
      ) : (
        <div className="space-y-3">
          {byDate.map(([day, list]) => (
            <div key={day}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                {new Date(`${day}T12:00:00`).toLocaleDateString(
                  lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
                  { day: "2-digit", month: "short" }
                )}
              </p>
              <Card>
                <CardContent className="divide-y p-0">
                  {list.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 px-3 py-2">
                      {tx.kind === "income" ? (
                        <ArrowUpCircle className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {catLabel(tx.category)}
                          {tx.description ? ` · ${tx.description}` : ""}
                        </p>
                        {tx.estimates?.title && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {tx.estimates.title}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "whitespace-nowrap text-sm font-semibold",
                          tx.kind === "income" ? "text-green-600" : "text-red-500"
                        )}
                      >
                        {tx.kind === "income" ? "+" : "−"}
                        {formatMoney(Number(tx.amount), lang)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        aria-label={t.common.delete}
                        onClick={() => remove(tx.id)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
