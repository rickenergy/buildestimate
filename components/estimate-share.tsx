"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { FileDown, MessageCircle } from "lucide-react";

interface Props {
  estimateId: string;
  title: string;
  total: number;
  areaSqft: number | null;
  estDays: number | null;
  companyName: string | null;
  proposalToken: string | null;
}

/** Share bar: print/PDF view + WhatsApp via wa.me deep link. */
export function EstimateShare({
  estimateId,
  title,
  total,
  areaSqft,
  estDays,
  companyName,
  proposalToken,
}: Props) {
  const t = useDict();
  const lang = useLang();
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);

  function waUrl() {
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 10) digits = `1${digits}`; // US default
    const proposalUrl = proposalToken
      ? `${window.location.origin}/p/${proposalToken}`
      : `${window.location.origin}/estimate/${estimateId}/print`;
    const lines = [
      `*${title}*`,
      companyName ?? "",
      `${t.estimate.total}: ${formatMoney(total, lang)}`,
      `${areaSqft ?? "—"} sqft · ${estDays ?? "—"} ${t.estimate.days}`,
      proposalToken ? `${t.proposal.title}: ${proposalUrl}` : "",
    ].filter(Boolean);
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function send() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    window.open(waUrl(), "_blank", "noopener");
    setOpen(false);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="outline">
        <Link href={`/estimate/${estimateId}/print`}>
          <FileDown className="mr-1 h-4 w-4" /> {t.share.savePdf}
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.share.whatsappTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{t.share.phone}</Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+1 (215) 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">{t.share.phoneHint}</p>
            </div>
            <Button onClick={send} disabled={phone.replace(/\D/g, "").length < 10}>
              <MessageCircle className="mr-1 h-4 w-4" /> {t.share.send}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
