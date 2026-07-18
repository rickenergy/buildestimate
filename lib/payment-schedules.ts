export type PaymentPreset = "deposit_progress_final" | "draw_10_80_10" | "milestone";

interface Tri {
  en: string;
  pt: string;
  es: string;
}

export interface PaymentPresetDef {
  id: PaymentPreset;
  label: Tri;
  hint: Tri;
  splits: { label: Tri; pct: number }[];
}

/** The 3 payment structures US residential/commercial contractors use most. */
export const PAYMENT_PRESETS: PaymentPresetDef[] = [
  {
    id: "deposit_progress_final",
    label: { en: "Deposit / Progress / Final", pt: "Entrada / Andamento / Final", es: "Anticipo / Avance / Final" },
    hint: {
      en: "Most common for residential jobs.",
      pt: "Mais comum em trabalhos residenciais.",
      es: "Lo más común en trabajos residenciales.",
    },
    splits: [
      { label: { en: "Deposit", pt: "Entrada", es: "Anticipo" }, pct: 40 },
      { label: { en: "Progress", pt: "Andamento", es: "Avance" }, pct: 40 },
      { label: { en: "Final", pt: "Final", es: "Final" }, pct: 20 },
    ],
  },
  {
    id: "draw_10_80_10",
    label: { en: "Draw schedule + retainage", pt: "Draws + retenção", es: "Draws + retención" },
    hint: {
      en: "Common on commercial jobs — 10% held back until completion.",
      pt: "Comum em obras comerciais — 10% retido até a conclusão.",
      es: "Común en obras comerciales — 10% retenido hasta el final.",
    },
    splits: [
      { label: { en: "Deposit", pt: "Entrada", es: "Anticipo" }, pct: 10 },
      { label: { en: "Progress draws", pt: "Draws de andamento", es: "Draws de avance" }, pct: 80 },
      { label: { en: "Final (retainage)", pt: "Final (retenção)", es: "Final (retención)" }, pct: 10 },
    ],
  },
  {
    id: "milestone",
    label: { en: "Milestone-based", pt: "Por marco / etapa", es: "Por hito / etapa" },
    hint: {
      en: "Paid as each phase of the project completes.",
      pt: "Pago conforme cada etapa do projeto é concluída.",
      es: "Se paga a medida que se completa cada etapa.",
    },
    splits: [
      { label: { en: "Phase 1", pt: "Etapa 1", es: "Etapa 1" }, pct: 34 },
      { label: { en: "Phase 2", pt: "Etapa 2", es: "Etapa 2" }, pct: 33 },
      { label: { en: "Phase 3 (final)", pt: "Etapa 3 (final)", es: "Etapa 3 (final)" }, pct: 33 },
    ],
  },
];

export function paymentPreset(id: string | null | undefined): PaymentPresetDef {
  return PAYMENT_PRESETS.find((p) => p.id === id) ?? PAYMENT_PRESETS[0];
}
