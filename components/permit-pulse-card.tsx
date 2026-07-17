"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/components/providers";
import { formatNumber } from "@/lib/format";
import type { AllPermitPulses, PermitSeries } from "@/lib/permits";
import type { CensusGeo } from "@/lib/census-region";
import { Building2, TrendingDown, TrendingUp, Minus, Info } from "lucide-react";

type Lang = "en" | "pt" | "es";

const GEO_LABEL: Record<CensusGeo, Record<Lang, string>> = {
  US: { en: "United States", pt: "Estados Unidos", es: "Estados Unidos" },
  NO: { en: "Northeast", pt: "Nordeste (NE)", es: "Noreste" },
  SO: { en: "South", pt: "Sul (S)", es: "Sur" },
  MW: { en: "Midwest", pt: "Centro-Oeste", es: "Medio Oeste" },
  WE: { en: "West", pt: "Oeste", es: "Oeste" },
};

// Which of the owner's states each region covers (context for the selector).
const GEO_STATES: Partial<Record<CensusGeo, string>> = {
  NO: "PA · NJ · NY · CT · MA · RI · NH · ME · VT",
  SO: "DE · MD · VA · FL · GA · TX · NC …",
};

const COPY = {
  title: { en: "Market pulse — building permits", pt: "Pulso do mercado — alvarás", es: "Pulso del mercado — permisos" },
  region: { en: "Region", pt: "Região", es: "Región" },
  permitsTotal: { en: "Permits · all units", pt: "Alvarás · total", es: "Permisos · total" },
  permitsSingle: { en: "Permits · single-family", pt: "Alvarás · unifamiliar", es: "Permisos · unifamiliar" },
  startsTotal: { en: "Housing starts", pt: "Obras iniciadas", es: "Inicios de obra" },
  unit: { en: "K/yr", pt: "mil/ano", es: "K/año" },
  yoy: { en: "vs last yr", pt: "vs ano passado", es: "vs año pasado" },
  whatTitle: { en: "What this means", pt: "O que significa", es: "Qué significa" },
  what: {
    en: "Permits = homes approved to be built (future work coming). Single-family = houses only. Housing starts = construction actually begun. Rising numbers = more demand in your area. Annual rate, in thousands, seasonally adjusted.",
    pt: "Alvarás = casas aprovadas para construir (trabalho futuro chegando). Unifamiliar = só casas. Obras iniciadas = construção que já começou. Números subindo = mais demanda na sua região. Taxa anual, em milhares, ajustada por sazonalidade.",
    es: "Permisos = casas aprobadas para construir (trabajo futuro). Unifamiliar = solo casas. Inicios = construcción ya comenzada. Números en alza = más demanda en tu zona. Tasa anual, en miles, ajustada estacionalmente.",
  },
  source: {
    en: "Source: U.S. Census Bureau — New Residential Construction, seasonally adjusted",
    pt: "Fonte: U.S. Census Bureau — New Residential Construction, ajustado por sazonalidade",
    es: "Fuente: U.S. Census Bureau — New Residential Construction, ajustado estacionalmente",
  },
  stateNote: {
    en: "State-level permit data isn't available free — the Census publishes only national + 4 regions.",
    pt: "Dados por estado não são gratuitos — o Census publica só nacional + 4 regiões.",
    es: "Los datos por estado no son gratuitos — el Census publica solo nacional + 4 regiones.",
  },
  needsKey: {
    en: "Add a free Census API key (CENSUS_API_KEY) to show building-permit trends.",
    pt: "Adicione uma chave grátis do Census (CENSUS_API_KEY) para ver tendências de alvarás.",
    es: "Agrega una clave gratis del Census (CENSUS_API_KEY) para ver tendencias de permisos.",
  },
  getKey: { en: "Get a free Census key →", pt: "Pegar chave grátis →", es: "Obtener clave gratis →" },
  unavailable: { en: "Permit data is momentarily unavailable.", pt: "Dados de alvarás indisponíveis no momento.", es: "Datos no disponibles ahora." },
} as const;

/** Line sparkline with area fill for a permit series. */
function Spark({ points, up }: { points: { value: number }[]; up: boolean }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (points.length - 1);
  const pts = points.map((p, i) => [i * step, h - ((p.value - min) / span) * (h - 4) - 2] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const color = up ? "text-emerald-500" : "text-rose-500";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-8 w-full ${color}`} preserveAspectRatio="none">
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function PermitPulseCard({
  pulse,
  defaultGeo,
}: {
  pulse: AllPermitPulses;
  defaultGeo: CensusGeo;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [showInfo, setShowInfo] = useState(false);

  const available = (["US", "NO", "SO", "MW", "WE"] as CensusGeo[]).filter((g) => pulse.byGeo[g]);
  const initial = pulse.byGeo[defaultGeo] ? defaultGeo : available[0] ?? "US";
  const [geo, setGeo] = useState<CensusGeo>(initial);

  if (pulse.needsKey) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {tr(COPY.title)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{tr(COPY.needsKey)}</p>
          <a href={pulse.signupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-primary underline">
            {tr(COPY.getKey)}
          </a>
        </CardContent>
      </Card>
    );
  }

  if (available.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {tr(COPY.title)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{tr(COPY.unavailable)}</CardContent>
      </Card>
    );
  }

  const series = pulse.byGeo[geo] ?? pulse.byGeo[available[0]] ?? [];

  const label: Record<PermitSeries["metric"], string> = {
    permits_total: tr(COPY.permitsTotal),
    permits_single: tr(COPY.permitsSingle),
    starts_total: tr(COPY.startsTotal),
  };

  const monthLabel = pulse.updated
    ? new Date(`${pulse.updated}-01T12:00:00`).toLocaleDateString(
        lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
        { month: "short", year: "numeric" }
      )
    : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {tr(COPY.title)}
          </CardTitle>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={tr(COPY.whatTitle)}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {/* region selector */}
        <div className="no-scrollbar mt-1 flex gap-1.5 overflow-x-auto pb-1">
          {available.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGeo(g)}
              className={`press shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                geo === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {tr(GEO_LABEL[g])}
            </button>
          ))}
        </div>
        {GEO_STATES[geo] && <p className="text-[11px] text-muted-foreground">{GEO_STATES[geo]}</p>}
      </CardHeader>

      <CardContent className="space-y-3">
        {showInfo && (
          <div className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">{tr(COPY.whatTitle)}</p>
            <p>{tr(COPY.what)}</p>
            <p className="mt-2 italic">{tr(COPY.stateNote)}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {series
            .filter((s) => s.latest !== null)
            .map((s) => {
              const up = (s.yoyPct ?? 0) > 0;
              const flat = (s.yoyPct ?? 0) === 0;
              const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
              const color = flat ? "text-muted-foreground" : up ? "text-emerald-500" : "text-rose-500";
              return (
                <div key={s.metric} className="rounded-xl border p-3 shadow-xs">
                  <p className="text-xs text-muted-foreground">{label[s.metric]}</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {formatNumber(s.latest!, lang)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">{tr(COPY.unit)}</span>
                  </p>
                  {s.yoyPct !== null && (
                    <p className={`flex items-center gap-1 text-xs font-medium ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {up ? "+" : ""}
                      {s.yoyPct}% {tr(COPY.yoy)}
                    </p>
                  )}
                  <div className="mt-1">
                    <Spark points={s.points} up={up || flat} />
                  </div>
                </div>
              );
            })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {tr(COPY.source)}
          {monthLabel ? ` · ${monthLabel}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
