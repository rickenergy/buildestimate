/**
 * Subcontractor score (0–100) from real history — powers the ranking that
 * decides who gets offered work first. Pure function, no I/O.
 * v1 signals: share responses (interest + speed), compliance docs, incidents.
 * See docs/subcontractor-module.md for the full model.
 */

export interface SubScoreInput {
  sharesTotal: number;
  interested: number;
  declined: number;
  /** average hours between share created and responded (null = no responses) */
  avgResponseHours: number | null;
  hasLicense: boolean;
  hasInsurance: boolean;
  /** insurance_expires ISO date, if known */
  insuranceExpires: string | null;
  incidentsOpen: number;
  incidentsResolved: number;
}

export type SubTier = "top" | "reliable" | "attention" | "risk";

export interface SubScore {
  score: number; // 0–100
  tier: SubTier;
  interestRatePct: number | null;
  avgResponseHours: number | null;
  compliant: boolean;
  insuranceExpired: boolean;
}

export function computeSubScore(s: SubScoreInput): SubScore {
  const answered = s.interested + s.declined;
  const interestRate = answered > 0 ? s.interested / answered : null;

  // Interest (0–35): how often they say yes. No history → neutral 18.
  const interest = interestRate == null ? 18 : Math.round(interestRate * 35);

  // Responsiveness (0–25): how fast they answer. No history → neutral 12.
  let resp = 12;
  if (s.avgResponseHours != null) {
    if (s.avgResponseHours <= 6) resp = 25;
    else if (s.avgResponseHours <= 24) resp = 20;
    else if (s.avgResponseHours <= 72) resp = 12;
    else resp = 5;
  }

  // Compliance (0–20): license + valid insurance.
  const insuranceExpired = !!s.insuranceExpires && s.insuranceExpires < new Date().toISOString().slice(0, 10);
  const insuranceOk = s.hasInsurance && !insuranceExpired;
  const compliance = (s.hasLicense ? 10 : 0) + (insuranceOk ? 10 : 0);

  // Track record (0–20): worked shares minus incident weight.
  const experience = Math.min(10, s.sharesTotal * 2);
  const safety = Math.max(0, 10 - s.incidentsOpen * 5 - s.incidentsResolved * 1);

  const score = Math.max(0, Math.min(100, interest + resp + compliance + experience + safety));
  const tier: SubTier = score >= 80 ? "top" : score >= 60 ? "reliable" : score >= 40 ? "attention" : "risk";

  return {
    score,
    tier,
    interestRatePct: interestRate == null ? null : Math.round(interestRate * 100),
    avgResponseHours: s.avgResponseHours,
    compliant: s.hasLicense && insuranceOk,
    insuranceExpired,
  };
}

export const TIER_STYLE: Record<SubTier, { emoji: string; cls: string }> = {
  top: { emoji: "🥇", cls: "bg-amber-400/20 text-amber-600 dark:text-amber-400" },
  reliable: { emoji: "🟢", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  attention: { emoji: "🟡", cls: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  risk: { emoji: "🔴", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

export const TIER_LABEL: Record<SubTier, { en: string; pt: string; es: string }> = {
  top: { en: "Top partner", pt: "Parceiro top", es: "Socio top" },
  reliable: { en: "Reliable", pt: "Confiável", es: "Confiable" },
  attention: { en: "Watch", pt: "Atenção", es: "Atención" },
  risk: { en: "Risk", pt: "Risco", es: "Riesgo" },
};
