"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { aiDraftEstimate, acceptAiDraft, type AiDraft } from "@/app/actions/ai-estimate";
import { improveDescription } from "@/app/actions/improve-description";
import { ProfitProtectionCard } from "@/components/profit-protection-card";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { AreaMeasures } from "@/components/area-measures";
import { locationIndex } from "@/lib/takeoff/location";
import { TRADES, type Trade } from "@/lib/types";
import {
  Camera,
  ChevronLeft,
  KeyRound,
  Loader2,
  MapPin,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 4;

/** Resize to ≤1280px JPEG data URL — keeps the action payload small. */
async function resizeImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function AiEstimateForm({ minMarginPct }: { minMarginPct: number }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [trade, setTrade] = useState<Trade>("painting");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [clientName, setClientName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [improving, setImproving] = useState(false);

  const locIdx = locationIndex(location);
  const money = (n: number) => formatMoney(n, lang);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].slice(0, room);
    const resized = await Promise.all(list.map(resizeImage));
    setPhotos((prev) => [...prev, ...resized]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function improve() {
    if (!description.trim() || improving) return;
    setImproving(true);
    try {
      const res = await improveDescription(trade, description);
      if (res.ok && res.text) setDescription(res.text);
      else if (res.needsKey) setNeedsKey(true);
      else if (res.error && res.error !== "empty") toast.error(res.error);
    } finally {
      setImproving(false);
    }
  }

  function generate() {
    if (!description.trim() && photos.length === 0) {
      toast.error(t.ai.needInput);
      return;
    }
    startTransition(async () => {
      const res = await aiDraftEstimate({
        trade,
        location: location.trim() || undefined,
        description: description.trim(),
        measurements: measurements.trim() || undefined,
        photos,
      });
      if (res.ok && res.draft) {
        setDraft(res.draft);
        setNeedsKey(false);
      } else if (res.needsKey) {
        setNeedsKey(true);
      } else {
        toast.error(res.error ?? t.common.error);
      }
    });
  }

  function accept() {
    if (!draft) return;
    startTransition(async () => {
      try {
        const { id } = await acceptAiDraft(draft, clientName.trim() || undefined);
        router.push(`/estimate/${id}`);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  // ---------- result ----------
  if (draft) {
    return (
      <div className="space-y-3">
        {/* mandatory disclaimer */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {t.ai.disclaimer}
        </div>

        <Card>
          <CardContent className="space-y-3 p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-base font-bold">{t.ai.scope}</h3>
              <Badge className={RISK_STYLES[draft.risk_level]}>
                {t.analysis.risk[draft.risk_level]}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed">{draft.scope}</p>

            <Separator />

            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t.ai.assumptions}
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {draft.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>

            {draft.warnings.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.ai.warnings}
                </p>
                <ul className="space-y-1">
                  {draft.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Separator />

            {/* line items */}
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t.ai.lineItems}
            </p>
            {draft.line_items.map((li, i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5 text-xs">
                <span className="min-w-0 flex-1 truncate">{li.name}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {li.quantity} {li.unit}
                </span>
                <span className="w-20 text-right font-medium">{money(li.total_cost)}</span>
              </div>
            ))}

            <Separator />

            <div className="space-y-1 text-xs">
              <Row label={t.estimate.labor} value={money(draft.labor_cost)} />
              <Row label={t.estimate.material} value={money(draft.material_cost)} />
              <Row label={t.ai.equipment} value={money(draft.equipment_cost)} />
              <Row label={t.estimate.overhead} value={money(draft.overhead)} />
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span>{t.ai.totalCost}</span>
                <span>{money(draft.total_cost)}</span>
              </div>
            </div>

            {/* price ladder */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["minimum", draft.minimum_price],
                  ["recommended", draft.recommended_price],
                  ["premium", draft.premium_price],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border px-2 py-2",
                    key === "recommended" && "border-primary bg-primary/10"
                  )}
                >
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {t.ai.prices[key]}
                  </p>
                  <p className="text-sm font-bold">{money(value)}</p>
                </div>
              ))}
            </div>

            <ProfitProtectionCard
              cost={draft.total_cost}
              price={draft.recommended_price}
              minMarginPct={minMarginPct}
            />

            <div className="grid gap-1.5">
              <Label>{t.form.clientName}</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>

            <Button className="h-11 w-full" onClick={accept} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              {t.ai.accept}
            </Button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => setDraft(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {t.wizard.back}
        </Button>
      </div>
    );
  }

  // ---------- form ----------
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-1.5">
            <Label>{t.form.trade}</Label>
            <Select value={trade} onValueChange={(v) => setTrade(v as Trade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADES.map((tr) => (
                  <SelectItem key={tr} value={tr}>
                    {t.trades[tr] ?? tr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {t.wizard.locationLabel}
            </Label>
            <AddressAutocomplete value={location} onChange={(full) => setLocation(full)} />
            {locIdx.label && (
              <p className="text-xs font-medium text-primary">
                {locIdx.label} · {t.wizard.costIndex} ×{locIdx.factor.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>{t.ai.description}</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-primary"
                disabled={improving || !description.trim()}
                onClick={improve}
              >
                {improving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {t.ai.improve}
              </Button>
            </div>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.ai.descriptionPlaceholder}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>{t.ai.measurements}</Label>
            <AreaMeasures photoCount={photos.length} onChange={(summary) => setMeasurements(summary)} />
          </div>

          {/* photos */}
          <div className="grid gap-1.5">
            <Label>{t.ai.photos}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label={t.common.delete}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-accent"
                  aria-label={t.chat.addPhoto}
                >
                  <Camera className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {needsKey && (
        <div className="flex items-start gap-2 rounded-xl border border-dashed bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          {t.market.needsKey}
        </div>
      )}

      <Button size="lg" className="h-12 w-full" onClick={generate} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 h-5 w-5 animate-spin" /> {t.ai.generating}
          </>
        ) : (
          <>
            <Sparkles className="mr-1 h-5 w-5" /> {t.ai.generate}
          </>
        )}
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">{t.ai.disclaimer}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
