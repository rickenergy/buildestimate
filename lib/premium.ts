/**
 * Plan / premium gating. Backed by profiles.plan ('trial' | 'pro' | 'free')
 * and profiles.trial_ends_at (now()+14d default). No Stripe yet — this is the
 * source of truth the UI reads for the crown badge and feature gating.
 */

export type Plan = "trial" | "pro" | "free";

export interface PlanInput {
  plan: string;
  trial_ends_at: string;
}

export interface PlanStatus {
  plan: Plan;
  isPro: boolean;
  isTrial: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
  expired: boolean;
  /** true when the user may use premium features (paid OR trial still valid) */
  hasAccess: boolean;
}

export function planStatus(p: PlanInput | null | undefined): PlanStatus {
  const plan = (p?.plan as Plan) ?? "trial";
  const isPro = plan === "pro";
  const ends = p?.trial_ends_at ? new Date(p.trial_ends_at).getTime() : 0;
  const now = Date.now();
  const isTrial = plan === "trial";
  const trialActive = isTrial && ends > now;
  const trialDaysLeft = trialActive ? Math.max(0, Math.ceil((ends - now) / 86_400_000)) : 0;
  const expired = isTrial && ends <= now;
  return {
    plan,
    isPro,
    isTrial,
    trialActive,
    trialDaysLeft,
    expired,
    hasAccess: isPro || trialActive,
  };
}

/** Convenience: may this profile use premium features right now? */
export function hasPremiumAccess(p: PlanInput | null | undefined): boolean {
  return planStatus(p).hasAccess;
}
