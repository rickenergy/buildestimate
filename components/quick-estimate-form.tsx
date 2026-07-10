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
import {
  TRADE_MEASURE,
  PITCH_FACTORS,
  SLAB_DEPTHS,
  type MeasureMode,
} from "@/lib/measure-modes";
import { TRADES, type QualityTier, type Trade } from "@/lib/types";
import type { AreaInput, TakeoffInput } from "@/lib/takeoff/types";
import { Loader2, MapPin, Plus, Ruler, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AreaRow {
  name: string;
  length: string;
  width: string;
}

const EMPTY_AREA: AreaRow = { name: "", length: "", width: "" };
const TIERS: QualityTier[] = ["basic", "standard", "premium"];

const MODE_ICON: Record<MeasureMode, string> = {
  area: "▦",
  wall: "▤",
  linear: "—",
  footprint: "⌂",
};

export function QuickEstimateForm() {
  const t = useDict();
  const [pending, startTransition] = useTransition();

  const [trade, setTrade] = useState<Trade>("flooring");
  const [mode, setMode] = useState<MeasureMode>(TRADE_MEASURE.flooring.primary);
  const [title, setTitle] = useState("");
  const [areas, setAreas] = useState<AreaRow[]>([{ ...EMPTY_AREA }]);
  const [totalSqft, setTotalSqft] = useState("");
  const [linearFeet, setLinearFeet] = useState("");
  const [wallHeight, setWallHeight] = useState("8");
  const [pitch, setPitch] = useState(1);
  const [depth, setDepth] = useState(4);
  const [doors, setDoors] = useState("");
  const [windows, setWindows] = useState("");
  const [tier, setTier] = useState<QualityTier>("standard");
  const [demo, setDemo] = useState(false);
  const [prep, setPrep] = useState(false);
  const [disposal, setDisposal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<EstimatePayload | null>(null);

  const cfg = TRADE_MEASURE[trade];
  const locIdx = locationIndex(location);

  function pickTrade(tr: Trade) {
    setTrade(tr);
    setMode(TRADE_MEASURE[tr].primary);
  }

  function setArea(i: number, patch: Partial<AreaRow>) {
    setAreas((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }

  function roomAreas(): AreaInput[] {
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

    const input: TakeoffInput = {
      trade,
      areas: [],
      quality_tier: tier,
      conditions: { demo, prep, disposal },
      location: location.trim() || undefined,
      client_name: clientName.trim() || undefined,
    };
    let label = "";

    if (mode === "linear") {
      const lf = Number(linearFeet);
      if (!(lf > 0)) {
        toast.error(t.measure.needLinear);
        return;
      }
      input.linear_feet = lf;
      label = `${lf} lf`;
    } else {
      const ra = roomAreas();
      if (ra.length === 0) {
        toast.error(t.form.needArea);
        return;
      }
      const foot = Math.ceil(
        ra.reduce((s, a) => s + (a.sqft ?? (a.length_ft ?? 0) * (a.width_ft ?? 0)), 0)
      );
      if (mode === "footprint") {
        const roof = Math.ceil(foot * pitch);
        input.areas = [{ sqft: roof }];
        label = `${roof} sqft`;
      } else {
        input.areas = ra;
        label = `${foot} sqft`;
        if (mode === "wall") input.wall_height_ft = Number(wallHeight) || 8;
      }
    }

    if (cfg.openings) {
      input.doors = Number(doors) || 0;
      input.windows = Number(windows) || 0;
    }
    if (cfg.depth) input.slab_depth_in = depth;

    input.title = title.trim() || `${t.trades[trade] ?? trade} — ${label}`;

    startTransition(async () => {
      try {
        setResult(await computeEstimate(input));
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  const showRooms = mode !== "linear";

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardContent className="grid gap-4 p-4">
            <div className="grid gap-1.5">
              <Label>{t.form.trade}</Label>
              <Select value={trade} onValueChange={(v) => pickTrade(v as Trade)}>
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
            <Label className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-primary" /> {t.measure.title}
            </Label>

            {/* measurement mode buttons */}
            {cfg.modes.length > 1 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {cfg.modes.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={mode === m ? "default" : "outline"}
                    onClick={() => setMode(m)}
                  >
                    <span className="mr-1">{MODE_ICON[m]}</span> {t.measure.mode[m]}
                  </Button>
                ))}
              </div>
            )}

            {/* linear feet */}
            {mode === "linear" && (
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{t.measure.linearFeet}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={linearFeet}
                  onChange={(e) => setLinearFeet(e.target.value)}
                  placeholder="lf"
                />
              </div>
            )}

            {/* room / footprint dimensions */}
            {showRooms && (
              <>
                {mode === "footprint" && (
                  <p className="text-xs text-muted-foreground">{t.measure.footprintHint}</p>
                )}
                {areas.map((area, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="grid flex-1 gap-1">
                      <span className="text-[10px] text-muted-foreground">{t.form.areaName}</span>
                      <Input value={area.name} onChange={(e) => setArea(i, { name: e.target.value })} />
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
              </>
            )}

            {/* wall height */}
            {mode === "wall" && (
              <div className="grid gap-1.5">
                <Label>{t.form.wallHeight}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["8", "9", "10"].map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={wallHeight === h ? "default" : "outline"}
                      onClick={() => setWallHeight(h)}
                    >
                      {h} ft
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* roof pitch */}
            {cfg.pitch && (
              <div className="grid gap-1.5">
                <Label>{t.measure.pitchLabel}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PITCH_FACTORS.map((p) => (
                    <Button
                      key={p.key}
                      type="button"
                      size="sm"
                      variant={pitch === p.factor ? "default" : "outline"}
                      onClick={() => setPitch(p.factor)}
                    >
                      {t.measure.pitch[p.key]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* slab depth */}
            {cfg.depth && (
              <div className="grid gap-1.5">
                <Label>{t.measure.depthLabel}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SLAB_DEPTHS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={depth === d ? "default" : "outline"}
                      onClick={() => setDepth(d)}
                    >
                      {d}&quot;
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* openings */}
            {cfg.openings && (
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t.measure.doors}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={doors}
                    onChange={(e) => setDoors(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t.measure.windows}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={windows}
                    onChange={(e) => setWindows(e.target.value)}
                  />
                </div>
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
