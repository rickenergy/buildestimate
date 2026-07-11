# Construction Knowledge Base — what the AI expert should "know"

Purpose: the salesperson knows **nothing** about construction. The AI agent
carries the expertise (US residential + commercial) distilled from these
sources and asks the right questions in **plain language**, then produces a
premium client-facing proposal. This file maps each source to where it applies
in the app.

Sources (tags): **[Est]** Estimating in Building Construction (Dagostino/Peterson) ·
**[Field]** Construction Project Management, field (Sears) ·
**[Contr]** Construction Contracting, company management (Clough) ·
**[Hand]** Building Construction Handbook (Chudley/Greeno) ·
**[Neuf]** Neufert Architects' Data.
PDFs live in `~/Documents/Livros/Construcao/` (read page ranges via pypdf; no poppler installed).

## Cross-cutting principle
Every question, label, and output must be plain language — understandable by
anyone with no construction background. The AI explains the *why* (advisor
pattern) so the salesperson learns while selling.

## 1. Estimate fidelity ladder — [Est]
- Estimate types by project phase: Conceptual (no plan yet) → Square-Foot →
  Assembly → Parametric → Detailed. Offer the right one for how much is known.
- **"To Bid or Not to Bid"** (Est ch.4-4): a bid/no-bid decision = the risk×profit
  score. The AI should tell the salesperson if a job is worth chasing.
- Workup Sheet → Summary Sheet flow; Errors & Omissions check; Site Investigation
  checklist feeds the advisor.

## 2. Reading plans (Epic D) — [Neuf][Hand][Est][Contr]
- **[Neuf]** Drawing symbol dictionary (water/drainage/electrical/gas/security),
  paper formats, sheet layout → lets the AI interpret a plan.
- **[Hand]** Construction documents, drawings, notations, sheet naming.
- **[Est]** Appendix outline specs for small-commercial / residential / commercial
  buildings → template of what to look for by project type.
- **[Contr]** **CSI MasterFormat 2014** division codes → organize plan-extracted
  works into a standard structured dropdown (not free text).

## 3. Client credit-app + commercial rules (Epic A/E) — [Contr][Est]
- Surety bonds: Bid Bond (AIA A310), Performance/Payment Bond (A312) → bonding
  capacity in client registration.
- Construction insurance (limits, additional insured).
- Agreement types: Lump-Sum · Unit-Price · Cost-Plus-Fee + GMP (A102) → contract
  type selector (drives payment schedule + risk).
- Business ownership / company org → company profile (EIN, years, structure).
- Typical GL Accounts (Appendix O) → standard finance categories.
- Instructions to Bidders, AIA A201 General Conditions, Supplementary Conditions
  → editable code-basis / rules per project (Epic E).

## 4. Field & real-time (Epic F) — [Field][Contr]
- **CPM** planning/scheduling, Production Planning, **Short-Interval Planning**,
  Time Acceleration → schedule engine + "next few weeks" view.
- Resource Management → workers per task / project.
- Project Cost System + Financial Management → job cost + cash flow (S-curve).
- Delivery methods: DBB · DB · CM · Fast-track/phased → project metadata.
- Project Safety (Contr ch.15) → jobsite safety checklists.
- Labor Law + Relations → prevailing wage / certified payroll.

## 5. Trades & checklists (advisor completeness) — [Est][Hand]
Each [Est] trade chapter has a **checklist** + labor factors + waste + cold-weather
+ subcontracting notes. Trades to add/deepen:
- Excavation/Earthwork [Est][Hand] — soil, dewatering, backfill, borrow/excess,
  rock, volume by cross-section / average-end-area.
- Concrete [Est] — reinforcing, vapor retarder, finishing, curing.
- Masonry, Metals (joists, decking, structural) [Est][Hand].
- Foundations/Substructure [Hand] — footings, piles, retaining walls, basement,
  waterproofing, underpinning, groundwater control.
- Roofs [Hand] — pitched/flat/green, tiling, U-values.
- MEP / Domestic Services [Hand] — drainage, cold/hot water, electrical, gas.
- Finishes/Internal [Hand][Est] — drywall, plaster, floors, stairs, ceilings,
  fire rating, sound insulation.

## 6. Code / energy / accessibility (Epic E editable) — [Hand][Neuf][Est]
- [Hand] Building Regs, U-values (thermal), fire-protection ratings, modular
  coordination.
- [Neuf] Wheelchair/ADA dimensions + room dimensional standards → validate
  measurements ("this hallway is below minimum").
- [Est] Split Home-Office Overhead vs Job Overhead (General Conditions) — today
  we use a single overhead.

## Build priority (matches roadmap)
1. **Epic G (next):** MasterFormat + Neufert symbols + outline specs feed the AI
   brain; "To Bid or Not to Bid" [Est] → the risk×profit hint for the salesperson.
2. **Epic A/E:** bonds/insurance/agreement-type [Contr] · GC overhead split [Est]
   · editable code-basis (A201) [Contr].
3. **Epic F:** CPM + short-interval + resource mgmt [Field] · safety [Contr].
4. **Ongoing:** per-trade checklists [Est] in the advisor · new trades [Hand].
