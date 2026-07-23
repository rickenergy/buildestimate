"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialsCard } from "@/components/materials-card";
import { useDict, useLang } from "@/components/providers";
import { computeEstimate } from "@/app/actions/estimates";
import { TRADE_MEASURE } from "@/lib/measure-modes";
import { TRADES, type Trade, type QualityTier, type EstimateItem } from "@/lib/types";
import type { AreaInput, TakeoffInput } from "@/lib/takeoff/types";

const TIERS: QualityTier[] = ["basic", "standard", "premium"];

const L = {
  intro: {
    en: "Pick a service and a size to see the material it typically needs — no estimate saved. Works for every trade.",
    pt: "Escolha um serviço e um tamanho para ver o material que ele costuma exigir — sem salvar orçamento. Vale para todo serviço.",
    es: "Elija un servicio y un tamaño para ver el material que suele necesitar — sin guardar presupuesto. Sirve para todo servicio.",
  },
  service: { en: "Service", pt: "Serviço", es: "Servicio" },
  area: { en: "Area (sqft)", pt: "Área (sqft)", es: "Área (sqft)" },
  linear: { en: "Linear feet", pt: "Metros lineares (ft)", es: "Pies lineales" },
  wallH: { en: "Wall height (ft)", pt: "Pé-direito (ft)", es: "Altura de pared (ft)" },
  doors: { en: "Doors", pt: "Portas", es: "Puertas" },
  windows: { en: "Windows", pt: "Janelas", es: "Ventanas" },
  depth: { en: "Slab depth (in)", pt: "Espessura da laje (in)", es: "Espesor losa (in)" },
  tier: { en: "Quality", pt: "Qualidade", es: "Calidad" },
  calc: { en: "Show material", pt: "Ver material", es: "Ver material" },
  tierLabel: { basic: { en: "Basic", pt: "Básico", es: "Básico" }, standard: { en: "Standard", pt: "Padrão", es: "Estándar" }, premium: { en: "Premium", pt: "Premium", es: "Premium" } },
};

export function MaterialReference() {
  const t = useDict();
  const lang = useLang();
  const tr = (m: Record<string, string>) => m[lang] ?? m.en;
  const [pending, startTransition] = useTransition();

  const [trade, setTrade] = useState<Trade>("drywall");
  const [size, setSize] = useState("1000");
  const [wallHeight, setWallHeight] = useState("8");
  const [doors, setDoors] = useState("");
  const [windows, setWindows] = useState("");
  const [depth, setDepth] = useState("4");
  const [tier, setTier] = useState<QualityTier>("standard");
  const [items, setItems] = useState<EstimateItem[] | null>(null);

  const cfg = TRADE_MEASURE[trade];
  const mode = cfg.primary;

  function run() {
    const n = Number(size);
    if (!(n > 0)) {
      toast.error(t.form?.needArea ?? "Enter a size");
      return;
    }
    const input: TakeoffInput = { trade, areas: [], quality_tier: tier, conditions: {} };
    if (mode === "linear") {
      input.linear_feet = n;
    } else {
      const area: AreaInput = { sqft: n };
      input.areas = [area];
      if (mode === "wall") input.wall_height_ft = Number(wallHeight) || 8;
    }
    if (cfg.openings) {
      input.doors = Number(doors) || 0;
      input.windows = Number(windows) || 0;
    }
    if (cfg.depth) input.slab_depth_in = Number(depth) || 4;

    startTransition(async () => {
      try {
        const res = await computeEstimate(input);
        // Shape ComputedItem[] into EstimateItem[] so MaterialsCard can render it.
        const mapped: EstimateItem[] = res.takeoff.items.map((it, i) => ({
          id: `ref-${i}`,
          estimate_id: "ref",
          user_id: "ref",
          kind: it.kind,
          description: it.description,
          qty: it.qty,
          unit: it.unit,
          unit_cost: it.unit_cost,
          total: it.total,
          is_estimated_price: it.is_estimated_price,
          sort_order: i,
        }));
        setItems(mapped);
      } catch {
        toast.error(t.common?.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4">
          <p className="text-sm text-muted-foreground">{tr(L.intro)}</p>

          <div className="grid gap-1.5">
            <Label>{tr(L.service)}</Label>
            <Select value={trade} onValueChange={(v) => setTrade(v as Trade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADES.map((tradeKey) => (
                  <SelectItem key={tradeKey} value={tradeKey}>
                    {t.trades?.[tradeKey] ?? tradeKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{mode === "linear" ? tr(L.linear) : tr(L.area)}</Label>
              <Input type="number" inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            {mode === "wall" && (
              <div className="grid gap-1.5">
                <Label>{tr(L.wallH)}</Label>
                <Input type="number" inputMode="numeric" value={wallHeight} onChange={(e) => setWallHeight(e.target.value)} />
              </div>
            )}
            {cfg.depth && (
              <div className="grid gap-1.5">
                <Label>{tr(L.depth)}</Label>
                <Input type="number" inputMode="numeric" value={depth} onChange={(e) => setDepth(e.target.value)} />
              </div>
            )}
          </div>

          {cfg.openings && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{tr(L.doors)}</Label>
                <Input type="number" inputMode="numeric" value={doors} onChange={(e) => setDoors(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-1.5">
                <Label>{tr(L.windows)}</Label>
                <Input type="number" inputMode="numeric" value={windows} onChange={(e) => setWindows(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>{tr(L.tier)}</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as QualityTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((ti) => (
                  <SelectItem key={ti} value={ti}>
                    {tr(L.tierLabel[ti])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={run} disabled={pending} className="w-full">
            <Calculator className="mr-1 h-4 w-4" /> {tr(L.calc)}
          </Button>
        </CardContent>
      </Card>

      {items && <MaterialsCard items={items} />}
    </div>
  );
}
