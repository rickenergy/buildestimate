/**
 * Safety checklist knowledge base. General OSHA-style checks apply to every
 * job; trade-specific checks cover the high-risk hazards of that trade.
 * Pure data — powers the Safety checklist card on an estimate. i18n inline.
 */

export interface SafetyItem {
  key: string; // stable id, persisted with the check
  label: { en: string; pt: string; es: string };
}

export const GENERAL_SAFETY: SafetyItem[] = [
  {
    key: "ppe",
    label: {
      en: "PPE worn (hard hat, eye & hand protection)",
      pt: "EPI em uso (capacete, óculos e luvas)",
      es: "EPP en uso (casco, gafas y guantes)",
    },
  },
  {
    key: "first_aid",
    label: {
      en: "First-aid kit on site",
      pt: "Kit de primeiros socorros no local",
      es: "Botiquín de primeros auxilios en el sitio",
    },
  },
  {
    key: "hazard_walk",
    label: {
      en: "Site walked for hazards before start",
      pt: "Local vistoriado por perigos antes de começar",
      es: "Sitio inspeccionado por peligros antes de empezar",
    },
  },
  {
    key: "housekeeping",
    label: {
      en: "Walkways clear, debris managed",
      pt: "Passagens livres, entulho controlado",
      es: "Pasillos despejados, escombros controlados",
    },
  },
  {
    key: "electrical",
    label: {
      en: "Cords/GFCI checked, no damaged tools",
      pt: "Cabos/GFCI checados, sem ferramentas danificadas",
      es: "Cables/GFCI revisados, sin herramientas dañadas",
    },
  },
  {
    key: "ladders",
    label: {
      en: "Ladders & scaffold inspected and secured",
      pt: "Escadas e andaimes inspecionados e fixos",
      es: "Escaleras y andamios inspeccionados y asegurados",
    },
  },
];

export const TRADE_SAFETY: Record<string, SafetyItem[]> = {
  roofing: [
    { key: "fall_protection", label: { en: "Fall protection: harness + anchors above 6 ft", pt: "Proteção contra queda: cinto + ancoragem acima de 1,8 m", es: "Protección contra caídas: arnés + anclajes sobre 1,8 m" } },
    { key: "roof_openings", label: { en: "Roof edges, skylights & holes flagged/covered", pt: "Bordas, claraboias e buracos sinalizados/cobertos", es: "Bordes, tragaluces y huecos señalizados/cubiertos" } },
    { key: "weather", label: { en: "Weather checked — no work on wet/icy roof", pt: "Clima verificado — sem trabalho em telhado molhado/gelado", es: "Clima verificado — sin trabajo en techo mojado/helado" } },
  ],
  framing: [
    { key: "fall_protection", label: { en: "Fall protection above 6 ft", pt: "Proteção contra queda acima de 1,8 m", es: "Protección contra caídas sobre 1,8 m" } },
    { key: "nail_gun", label: { en: "Nail gun: sequential trigger, no bypass", pt: "Pinadora: gatilho sequencial, sem burlar", es: "Clavadora: gatillo secuencial, sin anular" } },
  ],
  concrete: [
    { key: "silica", label: { en: "Silica dust control (wet cut / vacuum)", pt: "Controle de poeira de sílica (corte úmido/aspiração)", es: "Control de polvo de sílice (corte húmedo/aspirado)" } },
    { key: "chemical", label: { en: "Skin/eye protection from wet concrete", pt: "Proteção de pele/olhos contra concreto fresco", es: "Protección de piel/ojos contra concreto fresco" } },
  ],
  painting: [
    { key: "ventilation", label: { en: "Ventilation adequate; respirator for spray", pt: "Ventilação adequada; respirador para spray", es: "Ventilación adecuada; respirador para spray" } },
    { key: "lead", label: { en: "Pre-1978 building checked for lead paint", pt: "Prédio pré-1978 checado por tinta com chumbo", es: "Edificio pre-1978 revisado por pintura con plomo" } },
  ],
  drywall: [
    { key: "silica", label: { en: "Dust mask / silica control when sanding", pt: "Máscara / controle de sílica ao lixar", es: "Mascarilla / control de sílice al lijar" } },
  ],
  tile: [
    { key: "wet_saw", label: { en: "Wet saw guard in place; silica control", pt: "Proteção da serra úmida; controle de sílica", es: "Guarda de sierra húmeda; control de sílice" } },
  ],
  remodeling: [
    { key: "lockout", label: { en: "Utilities located & locked out before demo", pt: "Utilidades localizadas e travadas antes da demolição", es: "Servicios ubicados y bloqueados antes de demoler" } },
    { key: "asbestos_lead", label: { en: "Pre-1978: asbestos/lead assessed before demo", pt: "Pré-1978: amianto/chumbo avaliados antes da demolição", es: "Pre-1978: asbesto/plomo evaluados antes de demoler" } },
  ],
  siding: [
    { key: "fall_protection", label: { en: "Fall protection; power-line clearance", pt: "Proteção contra queda; distância de fios elétricos", es: "Protección contra caídas; distancia de líneas eléctricas" } },
  ],
  landscaping: [
    { key: "utilities_811", label: { en: "Underground utilities marked (call 811)", pt: "Utilidades subterrâneas marcadas (ligar 811)", es: "Servicios subterráneos marcados (llamar 811)" } },
    { key: "equipment_guards", label: { en: "Equipment guards in place", pt: "Proteções dos equipamentos no lugar", es: "Guardas de los equipos colocadas" } },
  ],
  finish_basement: [
    { key: "egress", label: { en: "Egress window & escape route clear", pt: "Janela de saída e rota de fuga livres", es: "Ventana de salida y ruta de escape despejadas" } },
    { key: "radon", label: { en: "Radon/moisture checked before enclosing", pt: "Radônio/umidade checados antes de fechar", es: "Radón/humedad revisados antes de cerrar" } },
  ],
};

/** Full checklist for a trade = general checks + trade-specific ones. */
export function getSafetyChecklist(trade: string): SafetyItem[] {
  return [...GENERAL_SAFETY, ...(TRADE_SAFETY[trade] ?? [])];
}
