/**
 * The advisor: questions the app raises up-front so the contractor can relay
 * them to the site manager and never miss what drives cost, schedule, and risk
 * on a job. Each question carries a "why" so it teaches while it asks.
 *
 * Grouped by category and tagged by estimate type. Some are shared, some are
 * specific to residential or commercial work. Answers are stored on the
 * estimate (advisor_answers jsonb) so the estimate becomes a living brief.
 */

import type { EstimateType } from "@/lib/types";
import type { Tri } from "@/lib/estimate-rules";

export type AdvisorCategory =
  | "scope"
  | "site"
  | "materials"
  | "labor"
  | "schedule"
  | "compliance"
  | "risk";

export interface AdvisorQuestion {
  id: string;
  category: AdvisorCategory;
  types: EstimateType[]; // which estimate types this applies to
  q: Tri;
  why: Tri;
  /** Only ask when materials are the contractor's responsibility. */
  materialsOnly?: boolean;
}

const BOTH: EstimateType[] = ["residential", "commercial"];

export const ADVISOR_QUESTIONS: AdvisorQuestion[] = [
  // ---------- scope ----------
  {
    id: "full_scope",
    category: "scope",
    types: BOTH,
    q: {
      en: "What exactly is included — and explicitly excluded?",
      es: "¿Qué se incluye exactamente — y qué se excluye explícitamente?",
      pt: "O que exatamente está incluído — e o que fica de fora?",
    },
    why: {
      en: "A clear scope line prevents disputes and unpaid extras later.",
      es: "Un alcance claro evita disputas y extras no pagados después.",
      pt: "Escopo claro evita disputa e extra não pago depois.",
    },
  },
  {
    id: "existing_conditions",
    category: "scope",
    types: BOTH,
    q: {
      en: "What's the condition of what's already there? Any demo needed?",
      es: "¿En qué estado está lo existente? ¿Se necesita demolición?",
      pt: "Qual o estado do que já existe? Precisa de demolição?",
    },
    why: {
      en: "Hidden damage and demo drive both cost and contingency.",
      es: "El daño oculto y la demolición mueven costo y contingencia.",
      pt: "Dano oculto e demolição movem custo e contingência.",
    },
  },
  // ---------- materials ----------
  {
    id: "who_buys_material",
    category: "materials",
    types: BOTH,
    materialsOnly: true,
    q: {
      en: "Who buys the material, and when can it be delivered/stored on site?",
      es: "¿Quién compra el material y cuándo se entrega/almacena en obra?",
      pt: "Quem compra o material e quando pode ser entregue/estocado na obra?",
    },
    why: {
      en: "Delivery timing and storage space directly affect the schedule.",
      es: "El tiempo de entrega y el espacio de almacenaje afectan el cronograma.",
      pt: "Prazo de entrega e espaço de estoque afetam direto o cronograma.",
    },
  },
  {
    id: "finishes_specs",
    category: "materials",
    types: ["residential"],
    materialsOnly: true,
    q: {
      en: "Any preferred brands, finishes, or exact specs?",
      es: "¿Marcas, acabados o especificaciones exactas preferidas?",
      pt: "Marcas, acabamentos ou especificações exatas preferidas?",
    },
    why: {
      en: "Finish level swings material cost widely — lock it before pricing.",
      es: "El nivel de acabado cambia mucho el costo — fíjalo antes de cotizar.",
      pt: "Nível de acabamento muda muito o custo — trave antes de precificar.",
    },
  },
  {
    id: "submittals",
    category: "materials",
    types: ["commercial"],
    materialsOnly: true,
    q: {
      en: "Are material submittals / approved product specs required?",
      es: "¿Se requieren submittals de material / especificaciones aprobadas?",
      pt: "Exige submittals de material / especificações aprovadas?",
    },
    why: {
      en: "Submittal approval can add weeks before you can order.",
      es: "La aprobación de submittals puede sumar semanas antes de pedir.",
      pt: "Aprovação de submittal pode somar semanas antes de pedir.",
    },
  },
  {
    id: "waste_disposal",
    category: "materials",
    types: BOTH,
    q: {
      en: "Where does debris go — dumpster on site? Expected waste amount?",
      es: "¿A dónde va el escombro — contenedor en obra? ¿Desperdicio esperado?",
      pt: "Para onde vai o entulho — caçamba na obra? Desperdício esperado?",
    },
    why: {
      en: "Disposal fees and waste factor are easy to forget and eat margin.",
      es: "Las tarifas de desecho y el desperdicio se olvidan y comen margen.",
      pt: "Taxa de descarte e fator de desperdício são esquecidos e comem margem.",
    },
  },
  // ---------- labor ----------
  {
    id: "crew_per_task",
    category: "labor",
    types: BOTH,
    q: {
      en: "How many workers can the site hold, and how many per task at once?",
      es: "¿Cuántos trabajadores caben en obra y cuántos por tarea a la vez?",
      pt: "Quantos trabalhadores cabem na obra e quantos por tarefa ao mesmo tempo?",
    },
    why: {
      en: "Crew size sets the duration and whether you must subcontract.",
      es: "El tamaño de cuadrilla define la duración y si hay que subcontratar.",
      pt: "Tamanho da equipe define a duração e se precisa subcontratar.",
    },
  },
  {
    id: "prevailing_wage",
    category: "labor",
    types: ["commercial"],
    q: {
      en: "Is this prevailing-wage or union? Certified payroll required?",
      es: "¿Es salario prevaleciente o sindical? ¿Nómina certificada requerida?",
      pt: "É salário prevalecente ou sindical? Exige folha certificada?",
    },
    why: {
      en: "Prevailing wage can raise labor cost 30–60% — must price it in.",
      es: "El salario prevaleciente puede subir la mano de obra 30–60%.",
      pt: "Salário prevalecente pode subir a mão de obra 30–60%.",
    },
  },
  {
    id: "other_trades",
    category: "labor",
    types: ["commercial"],
    q: {
      en: "Which other trades are on site, and who coordinates the schedule?",
      es: "¿Qué otros oficios están en obra y quién coordina el cronograma?",
      pt: "Quais outros serviços estão na obra e quem coordena o cronograma?",
    },
    why: {
      en: "Trade stacking and GC sequencing can idle your crew.",
      es: "El apilamiento de oficios y la secuencia del GC pueden parar tu cuadrilla.",
      pt: "Empilhamento de serviços e sequência do GC podem parar sua equipe.",
    },
  },
  // ---------- schedule ----------
  {
    id: "start_deadline",
    category: "schedule",
    types: BOTH,
    q: {
      en: "Desired start date and any hard deadline?",
      es: "¿Fecha de inicio deseada y algún plazo firme?",
      pt: "Data de início desejada e algum prazo firme?",
    },
    why: {
      en: "Deadlines drive crew size, overtime, and risk of penalties.",
      es: "Los plazos definen cuadrilla, horas extra y riesgo de multas.",
      pt: "Prazos definem equipe, hora extra e risco de multa.",
    },
  },
  {
    id: "work_hours",
    category: "schedule",
    types: ["commercial"],
    q: {
      en: "Any restricted hours — after-hours, weekends, occupied business?",
      es: "¿Horarios restringidos — fuera de hora, fines de semana, negocio abierto?",
      pt: "Horário restrito — fora de hora, fim de semana, negócio aberto?",
    },
    why: {
      en: "Night/weekend work carries premium labor rates.",
      es: "El trabajo nocturno/fin de semana lleva tarifas premium.",
      pt: "Trabalho noturno/fim de semana tem tarifa premium.",
    },
  },
  {
    id: "occupied_home",
    category: "schedule",
    types: ["residential"],
    q: {
      en: "Will the home be occupied during work? Pets or children present?",
      es: "¿Estará la casa habitada durante la obra? ¿Mascotas o niños?",
      pt: "A casa estará habitada durante a obra? Pets ou crianças?",
    },
    why: {
      en: "Occupied homes slow work and demand dust/safety controls.",
      es: "Las casas habitadas ralentizan y exigen control de polvo/seguridad.",
      pt: "Casa habitada atrasa e exige controle de poeira/segurança.",
    },
  },
  // ---------- site ----------
  {
    id: "access_utilities",
    category: "site",
    types: BOTH,
    q: {
      en: "Access, parking, elevator/stairs, power and water available on site?",
      es: "¿Acceso, estacionamiento, ascensor/escaleras, energía y agua en obra?",
      pt: "Acesso, estacionamento, elevador/escadas, energia e água na obra?",
    },
    why: {
      en: "Poor access adds labor hours you must price up-front.",
      es: "El mal acceso suma horas de mano de obra que debes cotizar.",
      pt: "Acesso ruim soma horas de mão de obra que você precisa cotar.",
    },
  },
  // ---------- compliance ----------
  {
    id: "permit_drawings",
    category: "compliance",
    types: ["commercial"],
    q: {
      en: "Are stamped drawings and an approved permit set already in hand?",
      es: "¿Ya se tienen planos sellados y set de permiso aprobado?",
      pt: "Já tem plantas seladas e set de alvará aprovado em mãos?",
    },
    why: {
      en: "No approved set means you can't order or start — schedule risk.",
      es: "Sin set aprobado no puedes pedir ni empezar — riesgo de cronograma.",
      pt: "Sem set aprovado não dá pra pedir nem começar — risco de cronograma.",
    },
  },
  {
    id: "insurance_bonds",
    category: "compliance",
    types: ["commercial"],
    q: {
      en: "What insurance limits, additional-insured, or bonds are required?",
      es: "¿Qué límites de seguro, asegurado adicional o fianzas se requieren?",
      pt: "Quais limites de seguro, segurado adicional ou fianças são exigidos?",
    },
    why: {
      en: "Bonds and higher COI limits carry real cost — bill for them.",
      es: "Las fianzas y límites altos de seguro cuestan — factúralos.",
      pt: "Fianças e limites altos de seguro custam — cobre por eles.",
    },
  },
  {
    id: "permit_who_pulls",
    category: "compliance",
    types: ["residential"],
    q: {
      en: "Who pulls the permit, and is HOA approval needed?",
      es: "¿Quién saca el permiso y se necesita aprobación del HOA?",
      pt: "Quem puxa o alvará e precisa de aprovação do HOA?",
    },
    why: {
      en: "Permit and HOA timelines can delay the start date.",
      es: "Los tiempos de permiso y HOA pueden retrasar el inicio.",
      pt: "Prazos de alvará e HOA podem atrasar o início.",
    },
  },
  // ---------- risk ----------
  {
    id: "retainage_terms",
    category: "risk",
    types: ["commercial"],
    q: {
      en: "What retainage % and payment terms (net-30/60)? Liquidated damages?",
      es: "¿Qué % de retención y términos de pago (net-30/60)? ¿Daños liquidados?",
      pt: "Qual % de retenção e prazo de pagamento (net-30/60)? Multa por atraso?",
    },
    why: {
      en: "These define your cashflow exposure and delay penalty.",
      es: "Definen tu exposición de flujo de caja y la multa por retraso.",
      pt: "Definem sua exposição de caixa e a multa por atraso.",
    },
  },
  {
    id: "unknowns",
    category: "risk",
    types: BOTH,
    q: {
      en: "Anything unusual you're worried about? Access, structure, surprises?",
      es: "¿Algo inusual que te preocupe? ¿Acceso, estructura, sorpresas?",
      pt: "Algo incomum que te preocupa? Acesso, estrutura, surpresas?",
    },
    why: {
      en: "Naming risks up-front lets you price contingency instead of eating it.",
      es: "Nombrar riesgos permite cotizar contingencia en vez de absorberla.",
      pt: "Nomear riscos deixa você cotar contingência em vez de absorvê-la.",
    },
  },
];

/** Questions relevant to a given estimate type + materials responsibility. */
export function advisorFor(
  type: EstimateType,
  materialsIncluded: boolean
): AdvisorQuestion[] {
  return ADVISOR_QUESTIONS.filter(
    (question) =>
      question.types.includes(type) &&
      (!question.materialsOnly || materialsIncluded)
  );
}
