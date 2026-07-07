"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDict } from "@/components/providers";
import { EstimatePreview, type EstimatePayload } from "@/components/estimate-preview";
import { ProjectAnalysisCard } from "@/components/project-analysis";
import { computeProject, type ProjectComputeResult } from "@/app/actions/estimates";
import { analyzeProject } from "@/lib/analysis";
import {
  PROPERTY_TYPES,
  ROOM_PRESETS,
  ROOM_OPENINGS,
  WORK_KEYS,
  WHOLE_PROPERTY_WORK,
  defaultRooms,
  roomPreset,
  workToTrade,
  type ProjectKind,
  type PropertyType,
  type RoomKey,
  type WizardRoom,
  type WorkKey,
} from "@/lib/wizard/schema";
import type { TakeoffInput } from "@/lib/takeoff/types";
import type { QualityTier } from "@/lib/types";
import {
  Building2,
  Home,
  Hammer,
  Loader2,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = 6; // kind → property → rooms → areas → works → details/review

export function SmartWizard() {
  const t = useDict();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ProjectKind>("residential");
  const [property, setProperty] = useState<PropertyType>("single_house");
  const [rooms, setRooms] = useState<WizardRoom[]>(() => defaultRooms("single_house"));
  const [works, setWorks] = useState<WorkKey[]>([]);
  const [wallHeight, setWallHeight] = useState(8);
  const [tier, setTier] = useState<QualityTier>("standard");
  const [demo, setDemo] = useState(false);
  const [prep, setPrep] = useState(false);
  const [disposal, setDisposal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [result, setResult] = useState<ProjectComputeResult | null>(null);

  const selected = rooms.filter((r) => r.selected);
  const totalSqft = Math.ceil(selected.reduce((s, r) => s + r.length * r.width, 0));

  const roomCounts = useMemo(() => {
    const counts = new Map<RoomKey, number>();
    for (const r of rooms) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
    return counts;
  }, [rooms]);

  function pickProperty(p: PropertyType) {
    setProperty(p);
    setRooms(defaultRooms(p));
  }

  function bumpRoom(key: RoomKey, delta: number) {
    if (delta > 0) {
      const preset = roomPreset(key);
      setRooms((prev) => [
        ...prev,
        { id: `${key}-${Date.now()}`, key, length: preset.length, width: preset.width, selected: true },
      ]);
    } else {
      setRooms((prev) => {
        const idx = prev.map((r) => r.key).lastIndexOf(key);
        return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
      });
    }
  }

  function toggleWork(w: WorkKey) {
    setWorks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  const canNext =
    step === 2 ? rooms.length > 0
    : step === 3 ? selected.length > 0
    : step === 4 ? works.length > 0
    : true;

  function workLabel(w: WorkKey) {
    return w === "metal_trim" ? t.wizard.metalTrim : (t.trades[w] ?? w);
  }

  function submit() {
    const conditions = { demo, prep, disposal };
    const doors = selected.reduce((s, r) => s + ROOM_OPENINGS[r.key].doors, 0);
    const windows = selected.reduce((s, r) => s + ROOM_OPENINGS[r.key].windows, 0);
    const areas = selected.map((r) => ({
      name: t.wizard.rooms[r.key],
      length_ft: r.length,
      width_ft: r.width,
    }));
    const footprintSqft = Math.ceil(rooms.reduce((s, r) => s + r.length * r.width, 0));

    const inputs: TakeoffInput[] = works.map((w) => {
      const { trade, material_name } = workToTrade(w);
      const whole = WHOLE_PROPERTY_WORK.includes(w);
      return {
        trade,
        title: workLabel(w),
        areas: whole ? [{ sqft: footprintSqft }] : areas,
        wall_height_ft: wallHeight,
        doors,
        windows,
        conditions,
        material_name: material_name ?? (trade === "framing" ? "interior partition" : undefined),
        quality_tier: tier,
      };
    });

    const title = `${t.wizard.property[property]} — ${totalSqft} sqft`;
    startTransition(async () => {
      try {
        const res = await computeProject(inputs, {
          title,
          area_sqft: totalSqft,
          quality_tier: tier,
          conditions,
          client_name: clientName.trim() || undefined,
        });
        setResult(res);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  if (result) {
    const analysis = analyzeProject(result.perTrade, result.payload.totals, {
      demo,
      prep,
      disposal,
    });
    return (
      <div className="space-y-3">
        <EstimatePreview payload={result.payload as EstimatePayload} />
        <ProjectAnalysisCard analysis={analysis} />
        <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {t.wizard.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: STEPS }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
            )}
          />
        ))}
      </div>

      {step === 0 && (
        <StepShell title={t.wizard.kindTitle}>
          <div className="grid grid-cols-2 gap-3">
            <BigCard
              icon={<Home className="h-8 w-8" />}
              label={t.wizard.residential}
              desc={t.wizard.residentialDesc}
              active={kind === "residential"}
              onClick={() => {
                setKind("residential");
                pickProperty("single_house");
                setStep(1);
              }}
            />
            <BigCard
              icon={<Building2 className="h-8 w-8" />}
              label={t.wizard.commercial}
              desc={t.wizard.commercialDesc}
              active={kind === "commercial"}
              onClick={() => {
                setKind("commercial");
                pickProperty("office");
                setStep(1);
              }}
            />
          </div>
        </StepShell>
      )}

      {step === 1 && (
        <StepShell title={t.wizard.propertyTitle}>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES[kind].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  pickProperty(p);
                  setStep(2);
                }}
                className={cn(
                  "rounded-xl border px-3 py-4 text-sm font-medium transition-colors",
                  property === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card hover:bg-accent"
                )}
              >
                {t.wizard.property[p]}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title={t.wizard.roomsTitle} hint={t.wizard.roomsHint}>
          <div className="grid gap-2">
            {ROOM_PRESETS.filter(
              (r) => kind === "commercial" || r.key !== "open_area"
            ).map(({ key }) => {
              const count = roomCounts.get(key) ?? 0;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2",
                    count > 0 ? "border-primary/40 bg-primary/5" : "bg-card"
                  )}
                >
                  <span className="text-sm font-medium">{t.wizard.rooms[key]}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={count === 0}
                      onClick={() => bumpRoom(key, -1)}
                      aria-label="−"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{count}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => bumpRoom(key, 1)}
                      aria-label="+"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title={t.wizard.areasTitle} hint={t.wizard.areasHint}>
          <div className="mb-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRooms((prev) => prev.map((r) => ({ ...r, selected: true })))}
            >
              {t.wizard.selectAll}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRooms((prev) => prev.map((r) => ({ ...r, selected: false })))}
            >
              {t.wizard.clearAll}
            </Button>
            <span className="ml-auto self-center text-xs text-muted-foreground">
              {totalSqft} sqft
            </span>
          </div>
          <div className="grid gap-2">
            {rooms.map((room, i) => (
              <div
                key={room.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  room.selected ? "border-primary/50 bg-primary/5" : "bg-card opacity-60"
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm font-medium"
                  onClick={() =>
                    setRooms((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, selected: !r.selected } : r))
                    )
                  }
                >
                  {t.wizard.rooms[room.key]}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {Math.round(room.length * room.width)} sqft
                  </span>
                </button>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  className="h-8 w-14 px-1 text-center text-xs"
                  value={room.length}
                  onChange={(e) =>
                    setRooms((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, length: Number(e.target.value) || 0 } : r))
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  className="h-8 w-14 px-1 text-center text-xs"
                  value={room.width}
                  onChange={(e) =>
                    setRooms((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, width: Number(e.target.value) || 0 } : r))
                    )
                  }
                />
              </div>
            ))}
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell title={t.wizard.worksTitle} hint={t.wizard.worksHint}>
          <div className="grid grid-cols-2 gap-2">
            {WORK_KEYS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleWork(w)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors",
                  works.includes(w)
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card hover:bg-accent"
                )}
              >
                <Hammer className="h-4 w-4 shrink-0 opacity-60" />
                {workLabel(w)}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === 5 && (
        <StepShell title={t.wizard.reviewTitle}>
          <Card>
            <CardContent className="grid gap-4 p-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Chip>{t.wizard.property[property]}</Chip>
                <Chip>
                  {selected.length} {t.wizard.summaryAreas}
                </Chip>
                <Chip>
                  {works.length} {t.wizard.summaryWorks}
                </Chip>
                <Chip>
                  {t.wizard.totalArea}: {totalSqft} sqft
                </Chip>
              </div>

              <div className="grid gap-1.5">
                <Label>{t.form.wallHeight}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[8, 9, 10].map((h) => (
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

              <div className="grid gap-1.5">
                <Label>{t.form.tier}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["basic", "standard", "premium"] as QualityTier[]).map((qt) => (
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
                <Label>{t.form.clientName}</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button
            type="button"
            size="lg"
            className="mt-3 h-12 w-full"
            disabled={pending}
            onClick={submit}
          >
            {pending ? (
              <>
                <Loader2 className="mr-1 h-5 w-5 animate-spin" /> {t.chat.calculating}
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-5 w-5" /> {t.form.calculate}
              </>
            )}
          </Button>
        </StepShell>
      )}

      {/* nav */}
      {step > 0 && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {t.wizard.back}
          </Button>
          {step < STEPS - 1 && (
            <Button type="button" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
              {t.wizard.next} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StepShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function BigCard({
  icon,
  label,
  desc,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-colors",
        active ? "border-primary bg-primary/10" : "bg-card hover:bg-accent"
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
      {children}
    </span>
  );
}
