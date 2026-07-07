"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict } from "@/components/providers";
import { EstimatePreview, type EstimatePayload } from "@/components/estimate-preview";
import { computeEstimate } from "@/app/actions/estimates";
import { locationIndex } from "@/lib/takeoff/location";
import { TRADES, type QualityTier, type Trade } from "@/lib/types";
import type { AreaInput } from "@/lib/takeoff/types";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AreaRow {
  name: string;
  length: string;
  width: string;
}

const EMPTY_AREA: AreaRow = { name: "", length: "", width: "" };
const TIERS: QualityTier[] = ["basic", "standard", "premium"];

export function QuickEstimateForm() {
  const t = useDict();
  const [pending, startTransition] = useTransition();

  const [trade, setTrade] = useState<Trade>("flooring");
  const [title, setTitle] = useState("");
  const [areas, setAreas] = useState<AreaRow[]>([{ ...EMPTY_AREA }]);
  const [totalSqft, setTotalSqft] = useState("");
  const [wallHeight, setWallHeight] = useState("8");
  const [tier, setTier] = useState<QualityTier>("standard");
  const [demo, setDemo] = useState(false);
  const [prep, setPrep] = useState(false);
  const [disposal, setDisposal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<EstimatePayload | null>(null);

  const showWallHeight = trade === "painting" || trade === "drywall";
  const locIdx = locationIndex(location);

  function setArea(i: number, patch: Partial<AreaRow>) {
    setAreas((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }

  function buildAreas(): AreaInput[] {
    const direct = Number(totalSqft);
    if (direct > 0) return [{ sqft: direct }];
    return areas
      .filter((a) => Number(a.length) > 0 && Number(a.width) > 0)
      .map((a) => ({
        name: a.name.trim() || undefined,
        length_ft: Number(a.length),
        width_ft: Number(a.width),
      }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const inputAreas = buildAreas();
    if (inputAreas.length === 0) {
      toast.error(t.form.needArea);
      return;
    }
    const sqft = Math.ceil(
      inputAreas.reduce((s, a) => s + (a.sqft ?? (a.length_ft ?? 0) * (a.width_ft ?? 0)), 0)
    );
    startTransition(async () => {
      try {
        const payload = await computeEstimate({
          trade,
          title: title.trim() || `${t.trades[trade] ?? trade} — ${sqft} sqft`,
          areas: inputAreas,
          wall_height_ft: showWallHeight ? Number(wallHeight) || 8 : undefined,
          quality_tier: tier,
          conditions: { demo, prep, disposal },
          location: location.trim() || undefined,
          client_name: clientName.trim() || undefined,
        });
        setResult(payload);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  return (
    <div className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
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
                <Label>{t.form.jobTitle}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.form.jobTitlePlaceholder}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3 p-4">
              <Label>{t.form.areas}</Label>
              {areas.map((area, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="grid flex-1 gap-1">
                    <span className="text-[10px] text-muted-foreground">{t.form.areaName}</span>
                    <Input
                      value={area.name}
                      onChange={(e) => setArea(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="grid w-20 gap-1">
                    <span className="text-[10px] text-muted-foreground">{t.form.length}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={area.length}
                      onChange={(e) => setArea(i, { length: e.target.value })}
                    />
                  </div>
                  <div className="grid w-20 gap-1">
                    <span className="text-[10px] text-muted-foreground">{t.form.width}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={area.width}
                      onChange={(e) => setArea(i, { width: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn("shrink-0", areas.length === 1 && "invisible")}
                    aria-label={t.common.delete}
                    onClick={() => setAreas((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAreas((prev) => [...prev, { ...EMPTY_AREA }])}
              >
                <Plus className="mr-1 h-4 w-4" /> {t.form.addArea}
              </Button>

              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{t.form.totalSqft}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={totalSqft}
                  onChange={(e) => setTotalSqft(e.target.value)}
                />
              </div>

              {showWallHeight && (
                <div className="grid gap-1.5">
                  <Label>{t.form.wallHeight}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 p-4">
              <div className="grid gap-1.5">
                <Label>{t.form.tier}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((qt) => (
                    <Button
                      key={qt}
                      type="button"
                      size="sm"
                      variant={tier === qt ? "default" : "outline"}
                      onClick={() => setTier(qt)}
                    >
                      {qt === "basic"
                        ? t.form.tierBasic
                        : qt === "standard"
                          ? t.form.tierStandard
                          : t.form.tierPremium}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <Label>{t.form.conditions}</Label>
                <label className="flex items-center justify-between text-sm">
                  {t.form.demo}
                  <Switch checked={demo} onCheckedChange={setDemo} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  {t.form.prep}
                  <Switch checked={prep} onCheckedChange={setPrep} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  {t.form.disposal}
                  <Switch checked={disposal} onCheckedChange={setDisposal} />
                </label>
              </div>

              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {t.wizard.locationLabel}
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t.wizard.locationPlaceholder}
                />
                {locIdx.label ? (
                  <p className="text-xs font-medium text-primary">
                    {locIdx.label} · {t.wizard.costIndex} ×{locIdx.factor.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t.wizard.locationHint}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label>{t.form.clientName}</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-1 h-5 w-5 animate-spin" /> {t.chat.calculating}
              </>
            ) : (
              t.form.calculate
            )}
          </Button>
        </form>

      {result && <EstimatePreview payload={result} />}
    </div>
  );
}
