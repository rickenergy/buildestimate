import type { Trade } from "@/lib/types";

/**
 * Job Standards & Adjacency knowledge base.
 *
 * Two jobs in one file:
 *  1. STANDARDS — for composite/high-code jobs (e.g. finish basement) we encode
 *     the building-code rules, the typical scope checklist, and measurement hints
 *     so the estimate is guided and "complete", not a blank number. Grounded in
 *     the US residential code (IRC 2021) and standard estimating practice.
 *  2. ADJACENCY — from one request, surface the *attached* problems/opportunities.
 *     A homeowner asking for X almost always needs Y and Z; this is how we turn a
 *     single lead into a full scope (and better marketing/upsell).
 *
 * Pure data — no AI, no I/O. i18n labels live in lib/i18n; keys here are stable ids.
 */

export interface CodeRule {
  /** stable id, also the i18n key under standards.code.* */
  key: string;
  /** short code reference, shown as a chip (e.g. "IRC R310") */
  ref: string;
  /** the requirement, plain English (fallback text; i18n overrides) */
  rule: string;
}

export interface AdjacentNeed {
  /** related trade/job to propose */
  trade: string;
  /** what in the original request triggers this */
  trigger: string;
  /** why it matters — the value story for the homeowner */
  why: string;
  /** how likely it rides along: "often" upsell vs "check" (conditional) */
  weight: "often" | "check";
}

export interface JobStandard {
  key: string;
  /** the Trade this maps to in the estimate engine */
  trade: Trade;
  /** true when the job bundles several sub-trades into one scope */
  composite: boolean;
  subScope: string[]; // human checklist of what's included (i18n: standards.<key>.scope.*)
  codes: CodeRule[];
  adjacent: AdjacentNeed[];
  measureHints: string[]; // i18n: standards.<key>.hint.*
}

/* ------------------------------------------------------------------ */
/* Finish Basement — flagship guided, code-heavy composite            */
/* ------------------------------------------------------------------ */

export const FINISH_BASEMENT: JobStandard = {
  key: "finish_basement",
  trade: "finish_basement",
  composite: true,
  subScope: [
    "moisture_barrier", // vapor barrier / dampproofing over slab + walls
    "framing", // 2x4 stud walls 16" OC furred off foundation
    "insulation", // R-13/R-15 cavity (climate-zone dependent)
    "electrical", // outlets, switches, lighting, dedicated circuits, GFCI/AFCI
    "drywall", // hang + tape + finish walls
    "ceiling", // drywall or drop ceiling (utility access)
    "egress", // emergency escape window + well when bedrooms/habitable
    "flooring", // underlayment + LVP (moisture-tolerant) over slab
    "trim_doors", // interior doors, casing, baseboard
    "permit", // building permit + inspections
  ],
  codes: [
    {
      key: "ceiling_height",
      ref: "IRC R305.1",
      rule: "Finished ceiling ≥ 7 ft (84 in); beams/ducts may project to 6 ft 4 in.",
    },
    {
      key: "egress",
      ref: "IRC R310",
      rule: "Every sleeping room + habitable basement needs an emergency egress: net opening ≥ 5.7 sq ft, ≥ 24 in high, ≥ 20 in wide, sill ≤ 44 in above floor. Below grade = window well with ladder if deeper than 44 in.",
    },
    {
      key: "insulation",
      ref: "IECC / IRC N1102",
      rule: "Basement walls insulated to R-13 to R-15 (cavity) or R-10 continuous, per climate zone.",
    },
    {
      key: "electrical",
      ref: "IRC E3901 / NEC",
      rule: "GFCI protection, AFCI on habitable circuits, and hard-wired interconnected smoke + CO alarms.",
    },
    {
      key: "moisture",
      ref: "IRC R406",
      rule: "Dampproof/waterproof and control moisture BEFORE framing — never finish over active water or efflorescence.",
    },
    {
      key: "hvac",
      ref: "IRC R303 / M1601",
      rule: "Habitable space needs conditioned air — supply + return, and mechanical/combustion clearances kept.",
    },
  ],
  adjacent: [
    {
      trade: "waterproofing",
      trigger: "any basement finish",
      why: "Finishing over damp walls traps moisture → mold + ruined drywall. Fix drainage/sump first.",
      weight: "often",
    },
    {
      trade: "egress",
      trigger: "adding a bedroom or sleeping area",
      why: "Legally required + a safety/resale point. Window well cut is a big cost driver — price it up front.",
      weight: "check",
    },
    {
      trade: "hvac",
      trigger: "no existing supply/return in the space",
      why: "Habitable space must be conditioned; extending ducts or a mini-split is a separate line.",
      weight: "check",
    },
    {
      trade: "plumbing",
      trigger: "client mentions bathroom, wet bar, or laundry",
      why: "Below-slab rough-in / ejector pump is expensive and must be roughed before the slab/floor closes.",
      weight: "check",
    },
    {
      trade: "radon",
      trigger: "below-grade living space",
      why: "Radon is common in basements; a mitigation stub during finish is cheap vs retrofit.",
      weight: "check",
    },
    {
      trade: "cleaning",
      trigger: "end of any build",
      why: "Post-construction clean is an easy add and leaves a better handoff.",
      weight: "often",
    },
  ],
  measureHints: [
    "measure_floor", // floor sqft drives insulation/drywall qty, flooring, ceiling
    "measure_height", // ceiling height gates code + wall area
    "measure_egress", // count egress windows needed (1 per sleeping room)
    "measure_bath", // flag if a bathroom/wet bar is in scope
  ],
};

export const JOB_STANDARDS: Record<string, JobStandard> = {
  finish_basement: FINISH_BASEMENT,
};

/* ------------------------------------------------------------------ */
/* General adjacency — turn any single request into a full scope       */
/* ------------------------------------------------------------------ */

/**
 * trade → work that commonly rides along. Powers the "Related work to propose"
 * card and future AI cross-sell. Kept deliberately practical: only pairings a
 * contractor would actually bundle.
 */
export const ADJACENCY: Record<string, AdjacentNeed[]> = {
  flooring: [
    { trade: "trim", trigger: "new floor", why: "Baseboard/quarter-round hides the expansion gap and finishes the look.", weight: "often" },
    { trade: "painting", trigger: "room is open anyway", why: "Cheapest time to repaint is before furniture returns.", weight: "check" },
    { trade: "drywall", trigger: "removing old floor", why: "Often exposes wall damage at the base worth patching now.", weight: "check" },
  ],
  painting: [
    { trade: "drywall", trigger: "walls have cracks/holes", why: "Patch + skim before paint or flaws telegraph through.", weight: "often" },
    { trade: "trim", trigger: "repainting a room", why: "Fresh trim/caulk lifts the whole job.", weight: "check" },
  ],
  roofing: [
    { trade: "gutters", trigger: "roof replacement", why: "Gutters come off anyway — replace worn ones on the same lift.", weight: "often" },
    { trade: "insulation", trigger: "roof open", why: "Attic air-seal + insulation while decking is exposed = big energy win.", weight: "check" },
    { trade: "siding", trigger: "fascia/soffit rot found", why: "Water damage at the eave usually needs trim/siding repair.", weight: "check" },
  ],
  siding: [
    { trade: "windows", trigger: "siding off", why: "Flashing windows correctly is only easy with siding removed.", weight: "check" },
    { trade: "gutters", trigger: "exterior refresh", why: "Matching new gutters completes the curb-appeal story.", weight: "check" },
  ],
  tile: [
    { trade: "plumbing", trigger: "bath/shower tile", why: "Valve/drain rough-in and waterproofing must precede tile.", weight: "often" },
    { trade: "drywall", trigger: "wet area", why: "Swap drywall for cement board behind wet tile.", weight: "often" },
  ],
  concrete: [
    { trade: "landscaping", trigger: "new slab/driveway", why: "Grading + drainage around the pour protects it.", weight: "check" },
  ],
  remodeling: [
    { trade: "electrical", trigger: "opening walls", why: "Update circuits/outlets while walls are open — code + resale.", weight: "often" },
    { trade: "plumbing", trigger: "kitchen/bath in scope", why: "Rough-in changes are cheap now, costly later.", weight: "check" },
    { trade: "painting", trigger: "any remodel", why: "Whole-room paint is the natural finish step.", weight: "often" },
  ],
  finish_basement: FINISH_BASEMENT.adjacent,
};

export function getStandard(trade: string): JobStandard | null {
  return JOB_STANDARDS[trade] ?? null;
}

export function getAdjacent(trade: string): AdjacentNeed[] {
  return ADJACENCY[trade] ?? [];
}
