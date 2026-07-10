/**
 * The particularities that separate a residential job from a commercial one:
 * code basis, permits/prerequisites, payment terms, suggested margin &
 * contingency, and the risks each type carries. Surfaced on the New-estimate
 * flow so the app behaves like an advisor from the first click.
 *
 * Defaults drafted from IRC/IBC practice — the contractor can override.
 */

import type { EstimateType } from "@/lib/types";

export type Tri = { en: string; es: string; pt: string };

export interface PaymentMilestone {
  label: Tri;
  pct: number;
}

export interface EstimateTypeRules {
  type: EstimateType;
  codeBasis: Tri;
  permit: Tri;
  paymentSchedule: PaymentMilestone[];
  retainagePct: number; // % held back until completion (commercial)
  suggestedMarginPct: number;
  contingencyPct: number;
  prerequisites: Tri[]; // must-haves before starting
  risks: Tri[]; // what to price/watch for
}

const RESIDENTIAL: EstimateTypeRules = {
  type: "residential",
  codeBasis: {
    en: "IRC (International Residential Code) + local amendments",
    es: "IRC (Código Residencial Internacional) + enmiendas locales",
    pt: "IRC (Código Residencial Internacional) + emendas locais",
  },
  permit: {
    en: "Local building permit, usually contractor-pulled; small repairs may be exempt. Inspections at rough-in and final.",
    es: "Permiso local, normalmente lo saca el contratista; reparaciones menores pueden estar exentas. Inspecciones en rough-in y final.",
    pt: "Alvará local, geralmente puxado pelo contratante; reparos pequenos podem ser isentos. Inspeções no rough-in e final.",
  },
  paymentSchedule: [
    { label: { en: "Deposit", es: "Anticipo", pt: "Entrada" }, pct: 40 },
    { label: { en: "Progress", es: "Avance", pt: "Andamento" }, pct: 40 },
    { label: { en: "Final", es: "Final", pt: "Final" }, pct: 20 },
  ],
  retainagePct: 0,
  suggestedMarginPct: 28,
  contingencyPct: 12,
  prerequisites: [
    {
      en: "Signed contract + deposit before ordering material",
      es: "Contrato firmado + anticipo antes de pedir material",
      pt: "Contrato assinado + entrada antes de pedir material",
    },
    {
      en: "Homeowner/HOA approval on finishes & schedule",
      es: "Aprobación del dueño/HOA sobre acabados y cronograma",
      pt: "Aprovação do dono/HOA sobre acabamentos e cronograma",
    },
    {
      en: "Lead-safe (RRP) check if home built before 1978",
      es: "Verificación de plomo (RRP) si la casa es anterior a 1978",
      pt: "Checagem de chumbo (RRP) se a casa é anterior a 1978",
    },
    {
      en: "Utility locate before any digging",
      es: "Localización de servicios antes de excavar",
      pt: "Localização de utilidades antes de escavar",
    },
  ],
  risks: [
    {
      en: "Hidden damage behind walls (rot, mold, wiring) — carry contingency",
      es: "Daño oculto tras las paredes (podredumbre, moho, cableado) — lleva contingencia",
      pt: "Dano oculto atrás das paredes (podridão, mofo, fiação) — leve contingência",
    },
    {
      en: "Scope creep from homeowner — document change orders",
      es: "Ampliación de alcance del dueño — documenta órdenes de cambio",
      pt: "Aumento de escopo do dono — documente ordens de mudança",
    },
    {
      en: "Working in an occupied home: dust control, pets, access windows",
      es: "Trabajar en casa habitada: control de polvo, mascotas, horarios de acceso",
      pt: "Trabalhar em casa habitada: controle de poeira, pets, janelas de acesso",
    },
  ],
};

const COMMERCIAL: EstimateTypeRules = {
  type: "commercial",
  codeBasis: {
    en: "IBC (International Building Code) + ADA + fire/life-safety; stamped drawings often required",
    es: "IBC (Código Internacional de Construcción) + ADA + seguridad contra incendios; planos sellados a menudo requeridos",
    pt: "IBC (Código Internacional de Construção) + ADA + segurança contra incêndio; plantas seladas quase sempre exigidas",
  },
  permit: {
    en: "Plan review + stamped A/E drawings, multiple inspections, Certificate of Occupancy. Prevailing wage on public work.",
    es: "Revisión de planos + planos sellados por A/E, múltiples inspecciones, Certificado de Ocupación. Salario prevaleciente en obra pública.",
    pt: "Revisão de projeto + plantas seladas por A/E, múltiplas inspeções, Certificado de Ocupação. Salário prevalecente em obra pública.",
  },
  paymentSchedule: [
    { label: { en: "Mobilization", es: "Movilización", pt: "Mobilização" }, pct: 10 },
    { label: { en: "Monthly progress (AIA)", es: "Avance mensual (AIA)", pt: "Andamento mensal (AIA)" }, pct: 80 },
    { label: { en: "Final (after punch list)", es: "Final (tras punch list)", pt: "Final (após punch list)" }, pct: 10 },
  ],
  retainagePct: 10,
  suggestedMarginPct: 18,
  contingencyPct: 8,
  prerequisites: [
    {
      en: "Stamped drawings & approved permit set",
      es: "Planos sellados y set de permiso aprobado",
      pt: "Plantas seladas e set de alvará aprovado",
    },
    {
      en: "Certificate of Insurance at required limits + additional insured",
      es: "Certificado de seguro con límites exigidos + asegurado adicional",
      pt: "Certificado de seguro nos limites exigidos + segurado adicional",
    },
    {
      en: "Payment & performance bonds if required",
      es: "Fianzas de pago y cumplimiento si se requieren",
      pt: "Fianças de pagamento e desempenho se exigidas",
    },
    {
      en: "Prevailing-wage / certified payroll setup on public jobs",
      es: "Configuración de salario prevaleciente / nómina certificada en obra pública",
      pt: "Configuração de salário prevalecente / folha certificada em obra pública",
    },
    {
      en: "Lien waivers & AIA G702/G703 billing agreed",
      es: "Renuncias de gravamen y facturación AIA G702/G703 acordadas",
      pt: "Renúncias de gravame e faturamento AIA G702/G703 acordados",
    },
  ],
  risks: [
    {
      en: "Retainage (≈10%) held to end — plan cashflow around it",
      es: "Retención (≈10%) retenida hasta el final — planifica el flujo de caja",
      pt: "Retenção (≈10%) segura até o fim — planeje o caixa em torno disso",
    },
    {
      en: "Liquidated damages for late completion — protect the schedule",
      es: "Daños liquidados por retraso — protege el cronograma",
      pt: "Multa por atraso (liquidated damages) — proteja o cronograma",
    },
    {
      en: "Coordination with other trades & GC schedule",
      es: "Coordinación con otros oficios y cronograma del GC",
      pt: "Coordenação com outros serviços e cronograma do GC",
    },
    {
      en: "After-hours / phased work in an occupied business",
      es: "Trabajo fuera de horario / por fases en negocio en operación",
      pt: "Trabalho fora de horário / faseado em negócio em operação",
    },
    {
      en: "Stricter inspections & compliance documentation",
      es: "Inspecciones más estrictas y documentación de cumplimiento",
      pt: "Inspeções mais rígidas e documentação de conformidade",
    },
  ],
};

export const ESTIMATE_RULES: Record<EstimateType, EstimateTypeRules> = {
  residential: RESIDENTIAL,
  commercial: COMMERCIAL,
};
