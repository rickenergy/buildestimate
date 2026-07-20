"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { addSubPayment, deleteSubPayment, type SubPaymentRow } from "@/app/actions/sub-payments";
import type { SubContractRow } from "@/app/actions/sub-contracts";
import { Wallet, Plus, Trash2, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Payments", pt: "Financeiro", es: "Pagos" },
  subtitle: {
    en: "Signed contracts vs what you've already paid.",
    pt: "Contratos assinados vs o que você já pagou.",
    es: "Contratos firmados vs lo que ya pagaste.",
  },
  contracted: { en: "Contracted", pt: "Contratado", es: "Contratado" },
  paid: { en: "Paid", pt: "Pago", es: "Pagado" },
  balance: { en: "To pay", pt: "A pagar", es: "Por pagar" },
  addPayment: { en: "Record payment", pt: "Registrar pagamento", es: "Registrar pago" },
  amount: { en: "Amount", pt: "Valor", es: "Monto" },
  date: { en: "Date", pt: "Data", es: "Fecha" },
  contract: { en: "Contract (optional)", pt: "Contrato (opcional)", es: "Contrato (opcional)" },
  note: { en: "Note (optional)", pt: "Nota (opcional)", es: "Nota (opcional)" },
  noContracts: {
    en: "No signed contracts yet — payments still work, linked or not.",
    pt: "Nenhum contrato assinado ainda — pagamentos funcionam mesmo assim.",
    es: "Sin contratos firmados aún — los pagos funcionan igual.",
  },
  history: { en: "Payment history", pt: "Histórico de pagamentos", es: "Historial de pagos" },
} as const;

export function SubFinanceCard({
  subcontractorId,
  contracts,
  payments,
}: {
  subcontractorId: string;
  contracts: SubContractRow[];
  payments: SubPaymentRow[];
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const money = (n: number) => formatMoney(n, lang);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [contractId, setContractId] = useState("");
  const [note, setNote] = useState("");

  const signed = contracts.filter((c) => c.status === "signed");
  const contracted = signed.reduce((s, c) => s + Number(c.amount), 0);
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, contracted - paidTotal);
  const paidByContract = new Map<string, number>();
  for (const p of payments) {
    if (p.contract_id) paidByContract.set(p.contract_id, (paidByContract.get(p.contract_id) ?? 0) + Number(p.amount));
  }

  function add() {
    startTransition(async () => {
      try {
        await addSubPayment({
          subcontractorId,
          contractId: contractId || null,
          amount: Number(amount),
          paidAt: paidAt || null,
          note,
        });
        setAmount("");
        setPaidAt("");
        setContractId("");
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" /> {tr(L.title)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tr(L.contracted)}</p>
            <p className="text-sm font-bold tabular-nums">{money(contracted)}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tr(L.paid)}</p>
            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{money(paidTotal)}</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tr(L.balance)}</p>
            <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{money(balance)}</p>
          </div>
        </div>

        {/* Per-contract progress */}
        {signed.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tr(L.noContracts)}</p>
        ) : (
          <div className="grid gap-2.5">
            {signed.map((c) => {
              const paid = paidByContract.get(c.id) ?? 0;
              const pct = Number(c.amount) > 0 ? Math.min(100, Math.round((paid / Number(c.amount)) * 100)) : 0;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {money(paid)} / {money(Number(c.amount))} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Record payment */}
        <div className="grid gap-2 rounded-lg bg-muted/40 p-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder={tr(L.amount)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} aria-label={tr(L.date)} />
          </div>
          {signed.length > 0 && (
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">{tr(L.contract)}</option>
              {signed.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {money(Number(c.amount))}
                </option>
              ))}
            </select>
          )}
          <Input placeholder={tr(L.note)} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="outline" disabled={pending || !amount || Number(amount) <= 0} onClick={add}>
            {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            {tr(L.addPayment)}
          </Button>
        </div>

        {/* History */}
        {payments.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{tr(L.history)}</p>
            <div className="grid gap-1">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {p.paid_at}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{money(Number(p.amount))}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    aria-label="delete"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteSubPayment(p.id, subcontractorId);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
