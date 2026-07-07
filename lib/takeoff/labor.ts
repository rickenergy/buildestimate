/**
 * Crew sizing from production rates (units one person installs per day).
 * Sources: common contractor rules of thumb, conservative side.
 */
const PRODUCTION_SQFT_PER_PERSON_DAY: Record<string, number> = {
  flooring: 350, // LVP/laminate click-lock
  tile: 90,
  painting: 800, // wall sqft, 2 coats
  drywall: 350, // hang + finish averaged over trip days
  roofing: 700,
  framing: 300, // wall sqft/day — EST Fig. 13-55: walls 18–30 hrs/MBM
  trim: 450, // EST Fig. 13-55 lf rates; floor-sqft basis
  siding: 300,
  concrete: 150,
  landscaping: 400,
  cleaning: 2000,
  remodeling: 200,
  handyman: 250,
};

export interface CrewPlan {
  crew_size: number;
  est_days: number;
}

export function planCrew(trade: string, areaSqft: number, hasDemo: boolean): CrewPlan {
  const rate = PRODUCTION_SQFT_PER_PERSON_DAY[trade] ?? 250;
  let personDays = areaSqft / rate;
  if (hasDemo) personDays *= 1.3; // demo + disposal adds ~30%
  personDays = Math.max(personDays, 0.5);

  // Prefer 2-person crews for jobs over 1 person-day; cap at 4.
  let crew = 1;
  if (personDays > 1.5) crew = 2;
  if (personDays > 8) crew = 3;
  if (personDays > 18) crew = 4;

  const days = Math.max(0.5, Math.round((personDays / crew) * 2) / 2);
  return { crew_size: crew, est_days: days };
}
