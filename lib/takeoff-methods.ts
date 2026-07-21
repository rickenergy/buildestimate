/**
 * Takeoff methodology per trade — grounded in standard US estimating/plan-
 * reading practice (Introduction to Estimating, Plan Reading & Construction
 * Techniques; DEWALT Construction Estimating; Blueprint Reading: Construction
 * Drawings for the Building Trade). Pure data.
 *
 * For each trade we encode WHAT to measure, HOW (unit + the rule that avoids the
 * classic errors: opening deductions, waste, coats, prep), WHICH sheets to look
 * at, and the questions a good estimator always asks before quoting. The AI uses
 * this so its takeoff follows the book, not a guess.
 */

export interface MeasureItem {
  key: string;
  what: { en: string; pt: string; es: string };
  unit: "sqft" | "lf" | "ea" | "cy" | "sq" | "ls";
  /** the measurement rule / best practice that prevents the classic mistake */
  rule: { en: string; pt: string; es: string };
}

export interface TradeMethod {
  trade: string;
  /** CSI-style division label */
  division: string;
  /** which drawing disciplines carry this trade's info */
  sheets: string[];
  measures: MeasureItem[];
  /** questions the estimator must resolve before the number is trustworthy */
  questions: { id: string; q: { en: string; pt: string; es: string } }[];
  /** typical waste factor guidance (shown, never auto-applied) */
  wasteHint: { en: string; pt: string; es: string };
}

const T = (en: string, pt: string, es: string) => ({ en, pt, es });

export const TAKEOFF_METHODS: Record<string, TradeMethod> = {
  painting: {
    trade: "painting",
    division: "09 90 00 Painting & Coating",
    sheets: ["architectural (floor plans, finish schedule, RCP, elevations)"],
    measures: [
      { key: "walls", what: T("Wall area", "Área de paredes", "Área de muros"), unit: "sqft", rule: T("Room perimeter × ceiling height, minus openings over 100 sqft (doors/large windows). Small openings are NOT deducted (industry rule).", "Perímetro do cômodo × pé-direito, menos aberturas acima de ~9 m². Aberturas pequenas NÃO são descontadas (regra da indústria).", "Perímetro × altura, menos aberturas mayores a ~9 m². Las pequeñas NO se descuentan.") },
      { key: "ceilings", what: T("Ceiling area", "Área de teto", "Área de techo"), unit: "sqft", rule: T("Floor area of each room to be painted; from the finish schedule / RCP.", "Área de piso de cada cômodo a pintar; pela tabela de acabamentos / RCP.", "Área de piso de cada cuarto; de la tabla de acabados.") },
      { key: "trim", what: T("Trim / baseboard", "Rodapé / molduras", "Zócalo / molduras"), unit: "lf", rule: T("Linear feet of baseboard, casing, crown per room perimeter and openings.", "Metros lineares de rodapé, guarnição, sanca por perímetro e aberturas.", "Metros lineales de zócalo, marcos, cornisa.") },
      { key: "doors", what: T("Doors / windows painted", "Portas / janelas pintadas", "Puertas / ventanas"), unit: "ea", rule: T("Count each; a door counts ~20 sqft per side, both sides + frame.", "Conte cada; porta ~1,8 m² por face, ambas + batente.", "Cuenta cada una; puerta ~1,8 m² por lado.") },
    ],
    questions: [
      { id: "coats", q: T("How many coats — and is a primer coat included?", "Quantas demãos — e inclui primer?", "¿Cuántas manos — e incluye imprimación?") },
      { id: "ceilings_incl", q: T("Are ceilings in scope, or walls only?", "Tetos entram no escopo, ou só paredes?", "¿Techos incluidos o solo muros?") },
      { id: "prep", q: T("Surface condition — new drywall, repaint, or heavy prep/patching?", "Condição da superfície — drywall novo, repintura, ou muito reparo?", "¿Condición — panel nuevo, repintar, o mucha preparación?") },
      { id: "sheen", q: T("Finish/sheen per surface (flat, eggshell, semi-gloss)?", "Acabamento por superfície (fosco, acetinado, semibrilho)?", "¿Acabado por superficie?") },
    ],
    wasteHint: T("Paint: ~350 sqft/gallon per coat; add ~5–10% for cut-in and touch-up.", "Tinta: ~32 m²/galão por demão; +5–10% para recortes e retoque.", "Pintura: ~32 m²/galón por mano; +5–10%."),
  },
  flooring: {
    trade: "flooring",
    division: "09 60 00 Flooring",
    sheets: ["architectural (floor plans, finish schedule)"],
    measures: [
      { key: "area", what: T("Floor area by room", "Área de piso por cômodo", "Área de piso por cuarto"), unit: "sqft", rule: T("Net area per room from dimensions; sum by material from the finish schedule.", "Área líquida por cômodo pelas cotas; some por material pela tabela de acabamentos.", "Área neta por cuarto; suma por material.") },
      { key: "transitions", what: T("Transitions / thresholds", "Transições / soleiras", "Transiciones / umbrales"), unit: "lf", rule: T("Linear feet at each material change and doorway.", "Metros lineares em cada troca de material e porta.", "Metros lineales en cada cambio y puerta.") },
      { key: "base", what: T("Base / shoe molding", "Rodapé / meia-cana", "Zócalo"), unit: "lf", rule: T("Room perimeter minus door openings.", "Perímetro menos vãos de porta.", "Perímetro menos puertas.") },
    ],
    questions: [
      { id: "material", q: T("Material & pattern (a diagonal/herringbone layout adds waste)?", "Material e padrão (diagonal/espinha adiciona perda)?", "¿Material y patrón (diagonal añade desperdicio)?") },
      { id: "subfloor", q: T("Subfloor prep / leveling needed? Underlayment?", "Preparo/nivelamento do contrapiso? Manta?", "¿Preparación del subsuelo? ¿Underlayment?") },
      { id: "demo", q: T("Remove existing flooring first?", "Remover o piso existente antes?", "¿Remover el piso existente?") },
    ],
    wasteHint: T("Waste: ~5% straight, ~10% diagonal, ~15% herringbone/tile patterns.", "Perda: ~5% reto, ~10% diagonal, ~15% espinha/padrões.", "Desperdicio: ~5% recto, ~10% diagonal, ~15% patrones."),
  },
  drywall: {
    trade: "drywall",
    division: "09 20 00 Gypsum Board",
    sheets: ["architectural (floor plans, wall types), RCP for ceilings"],
    measures: [
      { key: "walls", what: T("Wall board area", "Área de gesso em paredes", "Área de panel en muros"), unit: "sqft", rule: T("Wall length × height × faces; deduct only large openings.", "Comprimento × altura × faces; deduza só aberturas grandes.", "Largo × alto × caras; deduce solo aberturas grandes.") },
      { key: "ceilings", what: T("Ceiling board area", "Área de gesso em teto", "Área de panel en techo"), unit: "sqft", rule: T("Ceiling plan area where gypsum ceilings occur.", "Área do teto onde há forro de gesso.", "Área de techo con panel.") },
      { key: "corner_bead", what: T("Corner bead", "Cantoneira", "Esquinero"), unit: "lf", rule: T("Linear feet of outside corners.", "Metros lineares de cantos externos.", "Metros de esquinas externas.") },
    ],
    questions: [
      { id: "type", q: T("Board type per area (regular, moisture/cement board in wet areas, fire-rated)?", "Tipo de placa por área (comum, resistente à umidade em áreas molhadas, corta-fogo)?", "¿Tipo de panel por área?") },
      { id: "finish_level", q: T("Finish level (L1–L5) — affects tape/mud labor a lot?", "Nível de acabamento (L1–L5) — muda muito a mão de obra?", "¿Nivel de acabado (L1–L5)?") },
    ],
    wasteHint: T("Board comes 4×8/4×12; add ~10% waste. 1 sheet ≈ 32/48 sqft.", "Placa 4×8/4×12; +10% perda.", "Panel 4×8/4×12; +10%."),
  },
  tile: {
    trade: "tile",
    division: "09 30 00 Tiling",
    sheets: ["architectural (finish schedule, enlarged bath/kitchen plans, elevations)"],
    measures: [
      { key: "floor", what: T("Floor tile area", "Área de piso em cerâmica", "Área de piso en azulejo"), unit: "sqft", rule: T("Net floor area per tiled room.", "Área líquida por cômodo azulejado.", "Área neta por cuarto.") },
      { key: "wall", what: T("Wall tile area", "Área de parede em cerâmica", "Área de muro en azulejo"), unit: "sqft", rule: T("Wall height × length of tiled walls (showers, backsplashes) from elevations.", "Altura × comprimento das paredes azulejadas (box, backsplash) pelas elevações.", "Alto × largo de muros con azulejo.") },
    ],
    questions: [
      { id: "waterproof", q: T("Waterproofing/cement board behind wet-area tile?", "Impermeabilização/placa cimentícia atrás de área molhada?", "¿Impermeabilización/panel cementicio?") },
      { id: "size_pattern", q: T("Tile size & layout (large format / diagonal changes waste + labor)?", "Tamanho e assentamento (grande formato / diagonal muda perda e mão de obra)?", "¿Tamaño y patrón?") },
    ],
    wasteHint: T("Tile waste: ~10% standard, ~15%+ for large-format/diagonal.", "Perda: ~10% padrão, ~15%+ grande formato/diagonal.", "Desperdicio: ~10%, ~15%+ gran formato."),
  },
  roofing: {
    trade: "roofing",
    division: "07 30 00 Steep Slope Roofing",
    sheets: ["architectural (roof plan), structural for framing/slope"],
    measures: [
      { key: "area", what: T("Roof area (squares)", "Área do telhado (squares)", "Área de techo"), unit: "sq", rule: T("Plan area ÷ cos(slope) for true surface; 1 square = 100 sqft.", "Área em planta ÷ cos(inclinação) para superfície real; 1 square = 9,3 m².", "Área en planta ÷ cos(pendiente).") },
      { key: "eave_ridge", what: T("Eaves, ridges, hips, valleys", "Beirais, cumeeiras, espigões, águas-furtadas", "Aleros, cumbreras, limatesas") },
    ] as MeasureItem[],
    questions: [
      { id: "slope", q: T("Roof pitch/slope (drives true area + waste)?", "Inclinação do telhado (define área real e perda)?", "¿Pendiente del techo?") },
      { id: "layers", q: T("Tear-off existing layers or overlay?", "Remover camadas existentes ou sobrepor?", "¿Quitar capas o sobreponer?") },
    ],
    wasteHint: T("Shingles: +10% waste, +15% on complex/many hips-valleys.", "Telha: +10%, +15% em telhados complexos.", "Teja: +10%, +15% complejos."),
  },
  framing: {
    trade: "framing",
    division: "06 10 00 Rough Carpentry",
    sheets: ["structural (framing plans), architectural for layout"],
    measures: [
      { key: "wall_lf", what: T("Wall length", "Comprimento de paredes", "Largo de muros"), unit: "lf", rule: T("Linear feet of walls by type; studs = LF ÷ spacing + corners/openings.", "Metros lineares por tipo; montantes = ML ÷ espaçamento + cantos/aberturas.", "Metros por tipo; montantes = ML ÷ espaciado.") },
      { key: "floor_area", what: T("Floor/roof framed area", "Área estruturada de piso/telhado", "Área estructurada"), unit: "sqft", rule: T("For joists/rafters/sheathing by area.", "Para vigas/caibros/OSB por área.", "Para viguetas/OSB por área.") },
    ],
    questions: [
      { id: "spacing", q: T("Stud/joist spacing (16\" or 24\" OC) and lumber size?", "Espaçamento (16\"/24\") e bitola?", "¿Espaciado y escuadría?") },
      { id: "load", q: T("Any special/load-bearing conditions from the structural notes?", "Condições especiais/estruturais nas notas?", "¿Condiciones estructurales especiales?") },
    ],
    wasteHint: T("Lumber: +10–15% waste; account for headers, blocking, plates.", "Madeira: +10–15%; some vergas, bloqueios, soleiras.", "Madera: +10–15%."),
  },
  concrete: {
    trade: "concrete",
    division: "03 30 00 Cast-in-Place Concrete",
    sheets: ["structural / civil (foundation, slab plans)"],
    measures: [
      { key: "volume", what: T("Concrete volume", "Volume de concreto", "Volumen de concreto"), unit: "cy", rule: T("Length × width × thickness ÷ 27 = cubic yards.", "Comprimento × largura × espessura ÷ 27 = jardas cúbicas.", "L × A × E ÷ 27 = yardas cúbicas.") },
      { key: "form", what: T("Formwork / edge", "Fôrmas / borda", "Encofrado / borde"), unit: "lf" },
    ] as MeasureItem[],
    questions: [
      { id: "thickness", q: T("Slab thickness & mix (PSI) from structural?", "Espessura da laje e resistência (PSI)?", "¿Espesor y resistencia?") },
      { id: "reinf", q: T("Rebar/mesh schedule?", "Armadura/tela?", "¿Refuerzo/malla?") },
    ],
    wasteHint: T("Concrete: +5–10% for over-excavation/spillage.", "Concreto: +5–10% por sobre-escavação.", "Concreto: +5–10%."),
  },
};

export function methodFor(trade: string): TradeMethod | null {
  return TAKEOFF_METHODS[trade] ?? null;
}
