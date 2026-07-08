"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { upsertClient, updateClientStatus } from "@/app/actions/clients";
import { StageBars } from "@/components/charts";
import { CLIENT_STAGES } from "@/lib/types";
import type { ClientStatus, ClientRow } from "@/lib/types";
import { ChevronLeft, ChevronRight, Phone, Plus, Loader2, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientWithEstimates = ClientRow & {
  estimates: { id: string; title: string; total: number; status: string }[];
};

export function ClientsKanban({ clients }: { clients: ClientWithEstimates[] }) {
  const t = useDict();
  const lang = useLang();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const money = (n: number) => formatMoney(n, lang);
  const clientValue = (c: ClientWithEstimates) =>
    c.estimates.reduce((s, e) => s + Number(e.total), 0);

  const stages = useMemo(
    () =>
      CLIENT_STAGES.map((stage) => {
        const list = clients.filter((c) => c.status === stage);
        return {
          stage,
          list,
          value: list.reduce((s, c) => s + clientValue(c), 0),
        };
      }),
    [clients]
  );

  const pipelineValue = stages
    .filter((s) => s.stage !== "lost")
    .reduce((s, x) => s + x.value, 0);
  const openCount = clients.filter((c) => c.status !== "lost" && c.status !== "approved").length;
  const decided = clients.filter((c) => c.status === "approved" || c.status === "lost");
  const winRate =
    decided.length > 0
      ? Math.round(
          (clients.filter((c) => c.status === "approved").length / decided.length) * 100
        )
      : null;

  function move(c: ClientWithEstimates, dir: -1 | 1) {
    const idx = CLIENT_STAGES.indexOf(c.status);
    const next = CLIENT_STAGES[idx + dir];
    if (!next) return;
    startTransition(async () => {
      await updateClientStatus(c.id, next as ClientStatus);
    });
  }

  function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await upsertClient({ name: name.trim(), phone: phone.trim() || undefined });
        setName("");
        setPhone("");
        setOpen(false);
        toast.success(t.finance.added);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* dashboard */}
      <div className="grid grid-cols-3 gap-2">
        <Tile
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label={t.crm.pipeline}
          value={money(pipelineValue)}
        />
        <Tile
          icon={<Users className="h-4 w-4 text-primary" />}
          label={t.crm.openDeals}
          value={String(openCount)}
        />
        <Tile
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label={t.crm.winRate}
          value={winRate === null ? "—" : `${winRate}%`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.crm.funnel}</CardTitle>
        </CardHeader>
        <CardContent>
          <StageBars
            rows={stages.map((s) => ({
              label: t.clients.status[s.stage],
              value: s.value,
              count: s.list.length,
            }))}
            formatValue={money}
          />
        </CardContent>
      </Card>

      {/* board */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {stages.map(({ stage, list, value }) => (
            <div key={stage} className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.clients.status[stage]}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                  {list.length}
                </span>
              </div>
              <div
                className={cn(
                  "min-h-24 space-y-2 rounded-2xl border border-dashed p-2",
                  stage === "approved" && "border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30",
                  stage === "lost" && "opacity-70"
                )}
              >
                {list.map((c) => {
                  const value = clientValue(c);
                  const idx = CLIENT_STAGES.indexOf(c.status);
                  return (
                    <div key={c.id} className="rounded-xl border bg-card p-2.5 shadow-sm">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          {c.phone && (
                            <>
                              <Phone className="h-3 w-3" /> {c.phone}
                            </>
                          )}
                        </span>
                        <span className="font-semibold text-foreground">
                          {value > 0 ? money(value) : "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {c.estimates.length} {t.nav.estimates.toLowerCase()}
                      </p>
                      <div className="mt-1.5 flex justify-between">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={pending || idx === 0}
                          aria-label="◀"
                          onClick={() => move(c, -1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={pending || idx === CLIENT_STAGES.length - 1}
                          aria-label="▶"
                          onClick={() => move(c, 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
                    {value === 0 ? t.crm.emptyStage : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* add client */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="mr-1 h-4 w-4" /> {t.clients.add}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.clients.add}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addClient} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{t.clients.name}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.clients.phone}</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t.clients.save}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
        {icon}
        <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
