"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { publicBaseUrl } from "@/lib/site-url";
import {
  generateProposalText,
  updateProposal,
  sendProposal,
} from "@/app/actions/proposals";
import { ArrowLeft, FileText, Send, Copy, ExternalLink, Loader2, CircleCheck } from "lucide-react";
import type { Estimate, Proposal } from "@/lib/types";

interface Props {
  estimate: Pick<Estimate, "id" | "title" | "trade" | "total" | "status">;
  proposal: Proposal;
}

export function ProposalEditor({ estimate, proposal }: Props) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [generating, startGenerate] = useTransition();
  const [sending, startSend] = useTransition();
  const [scope, setScope] = useState(proposal.scope);
  const [exclusions, setExclusions] = useState(proposal.exclusions);
  const [terms, setTerms] = useState(proposal.terms);
  const [validUntil, setValidUntil] = useState(proposal.valid_until ?? "");

  const publicUrl = `${publicBaseUrl()}/p/${proposal.token}`;

  const isSent = proposal.status !== "draft";

  function generate() {
    startGenerate(async () => {
      const out = await generateProposalText(estimate.id);
      setScope(out.scope);
      setExclusions(out.exclusions);
      setTerms(out.terms);
      toast.success(t.proposal.title + " ✓");
    });
  }

  async function persist() {
    await updateProposal(proposal.id, {
      scope,
      exclusions,
      terms,
      valid_until: validUntil || undefined,
    });
  }

  function send() {
    startSend(async () => {
      await persist();
      await sendProposal(proposal.id);
      await navigator.clipboard.writeText(publicUrl).catch(() => {});
      toast.success(t.proposal.linkCopied);
      router.refresh();
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    toast.success(t.proposal.linkCopied);
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label={t.common.back}>
          <Link href={`/estimate/${estimate.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{t.proposal.title}</h1>
          <p className="text-xs text-muted-foreground">
            {estimate.title} · {formatMoney(Number(estimate.total), lang)}
          </p>
        </div>
        {proposal.status === "accepted" ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CircleCheck className="mr-1 h-3 w-3" /> {t.proposal.accepted}
          </Badge>
        ) : proposal.status === "viewed" ? (
          <Badge variant="outline">{t.proposal.viewed}</Badge>
        ) : isSent ? (
          <Badge variant="outline">{t.estimate.status.sent}</Badge>
        ) : null}
      </header>

      <Button onClick={generate} disabled={generating} variant="secondary">
        {generating ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t.proposal.generating}
          </>
        ) : (
          <>
            <FileText className="mr-1 h-4 w-4" /> {t.proposal.generate}
          </>
        )}
      </Button>

      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-1.5">
            <Label>{t.proposal.scope}</Label>
            <Textarea rows={7} value={scope} onChange={(e) => setScope(e.target.value)} onBlur={persist} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.proposal.exclusions}</Label>
            <Textarea rows={4} value={exclusions} onChange={(e) => setExclusions(e.target.value)} onBlur={persist} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.proposal.terms}</Label>
            <Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} onBlur={persist} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.proposal.validUntil}</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              onBlur={persist}
            />
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="h-12" onClick={send} disabled={sending || !scope}>
        {sending ? (
          <Loader2 className="mr-1 h-5 w-5 animate-spin" />
        ) : (
          <Send className="mr-1 h-5 w-5" />
        )}
        {t.proposal.send}
      </Button>

      {isSent && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={copyLink}>
            <Copy className="mr-1 h-4 w-4" /> {t.proposal.copyLink}
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" /> Link
            </a>
          </Button>
        </div>
      )}
    </main>
  );
}
