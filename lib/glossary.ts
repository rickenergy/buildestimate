/**
 * Plain-language glossary for every piece of jargon in the app.
 * Self-contained + trilingual so anyone can open the app and understand
 * each term and task with zero learning curve. Consumed by <InfoHint /> for
 * inline ⓘ popovers and by the /guide page for the full legend.
 */

export type GLang = "en" | "es" | "pt";

export type GlossaryCategory = "metrics" | "status" | "money" | "work" | "sections";

export interface GlossaryEntry {
  id: string;
  category: GlossaryCategory;
  term: Record<GLang, string>;
  short: Record<GLang, string>;
  long?: Record<GLang, string>;
}

export const GUIDE_UI: Record<
  GLang,
  {
    title: string;
    subtitle: string;
    search: string;
    empty: string;
    open: string;
    categories: Record<GlossaryCategory, string>;
  }
> = {
  en: {
    title: "Guide & glossary",
    subtitle: "Every term and task in plain language. No experience needed.",
    search: "Search a term…",
    empty: "No term matches your search.",
    open: "Guide",
    categories: {
      metrics: "Numbers & metrics",
      status: "Estimate statuses",
      money: "Money & billing",
      work: "The work itself",
      sections: "App sections",
    },
  },
  es: {
    title: "Guía y glosario",
    subtitle: "Cada término y tarea en lenguaje simple. Sin experiencia previa.",
    search: "Busca un término…",
    empty: "Ningún término coincide con tu búsqueda.",
    open: "Guía",
    categories: {
      metrics: "Números y métricas",
      status: "Estados del presupuesto",
      money: "Dinero y facturación",
      work: "El trabajo en sí",
      sections: "Secciones de la app",
    },
  },
  pt: {
    title: "Guia e glossário",
    subtitle: "Cada termo e tarefa em linguagem simples. Sem experiência prévia.",
    search: "Busque um termo…",
    empty: "Nenhum termo corresponde à sua busca.",
    open: "Guia",
    categories: {
      metrics: "Números e métricas",
      status: "Status do orçamento",
      money: "Dinheiro e cobrança",
      work: "O trabalho em si",
      sections: "Seções do app",
    },
  },
};

export const GLOSSARY: GlossaryEntry[] = [
  // ---------- metrics ----------
  {
    id: "win_rate",
    category: "metrics",
    term: { en: "Win rate", es: "Tasa de conversión", pt: "Taxa de conversão" },
    short: {
      en: "Of the estimates you decided, the share that became jobs.",
      es: "De los presupuestos que se decidieron, cuántos se volvieron trabajos.",
      pt: "Dos orçamentos já decididos, quantos viraram trabalho.",
    },
    long: {
      en: "Won ÷ (Won + Lost). If you sent 10 estimates and won 4, your win rate is 40%. Higher means you close more of what you quote.",
      es: "Ganados ÷ (Ganados + Perdidos). Si enviaste 10 y ganaste 4, es 40%. Más alto = cierras más de lo que cotizas.",
      pt: "Ganhos ÷ (Ganhos + Perdidos). Se enviou 10 e ganhou 4, é 40%. Maior = fecha mais do que orça.",
    },
  },
  {
    id: "pipeline",
    category: "metrics",
    term: { en: "Pipeline", es: "Embudo / Pipeline", pt: "Funil / Pipeline" },
    short: {
      en: "Total value of estimates still open (not yet won or lost).",
      es: "Valor total de presupuestos abiertos (aún sin decidir).",
      pt: "Valor total de orçamentos em aberto (ainda sem decisão).",
    },
  },
  {
    id: "margin",
    category: "metrics",
    term: { en: "Margin", es: "Margen", pt: "Margem" },
    short: {
      en: "Profit as a % of price. $1,000 job costing $800 → 20% margin.",
      es: "Ganancia como % del precio. Trabajo de $1,000 que cuesta $800 → 20%.",
      pt: "Lucro como % do preço. Trabalho de $1.000 que custa $800 → 20%.",
    },
  },
  {
    id: "profit_protection",
    category: "metrics",
    term: { en: "Profit protection", es: "Protección de ganancia", pt: "Proteção de lucro" },
    short: {
      en: "A guard that warns when your price drops below your minimum margin.",
      es: "Una alerta si tu precio baja del margen mínimo.",
      pt: "Um alerta se seu preço cair abaixo da margem mínima.",
    },
    long: {
      en: "Green means the price keeps your target profit. Red means you'd earn too little — it suggests a safer price.",
      es: "Verde = el precio mantiene tu ganancia objetivo. Rojo = ganarías muy poco; sugiere un precio más seguro.",
      pt: "Verde = o preço mantém seu lucro-alvo. Vermelho = ganharia pouco; sugere um preço mais seguro.",
    },
  },
  {
    id: "contingency",
    category: "metrics",
    term: { en: "Contingency", es: "Contingencia", pt: "Contingência" },
    short: {
      en: "A safety buffer added for surprises (hidden damage, price changes).",
      es: "Un colchón de seguridad para imprevistos (daños ocultos, cambios de precio).",
      pt: "Uma reserva de segurança para imprevistos (danos ocultos, mudança de preço).",
    },
  },
  {
    id: "waste_factor",
    category: "metrics",
    term: { en: "Waste factor", es: "Factor de desperdicio", pt: "Fator de desperdício" },
    short: {
      en: "Extra material bought to cover cuts and mistakes (e.g. +10%).",
      es: "Material extra para cubrir cortes y errores (ej. +10%).",
      pt: "Material extra para cobrir cortes e erros (ex. +10%).",
    },
  },
  {
    id: "yoy",
    category: "metrics",
    term: { en: "YoY (year over year)", es: "Interanual (vs año ant.)", pt: "Anual (vs ano ant.)" },
    short: {
      en: "Change vs the same month one year ago.",
      es: "Cambio frente al mismo mes de hace un año.",
      pt: "Variação frente ao mesmo mês de um ano atrás.",
    },
  },
  {
    id: "seasonally_adjusted",
    category: "metrics",
    term: { en: "Seasonally adjusted", es: "Ajustado estacionalmente", pt: "Ajustado sazonalmente" },
    short: {
      en: "Numbers smoothed so winter/summer swings don't distort the trend.",
      es: "Cifras suavizadas para que invierno/verano no distorsionen la tendencia.",
      pt: "Números suavizados para inverno/verão não distorcerem a tendência.",
    },
  },
  {
    id: "housing_starts",
    category: "metrics",
    term: { en: "Housing starts", es: "Inicios de vivienda", pt: "Obras iniciadas" },
    short: {
      en: "New homes that began construction — a demand signal for the market.",
      es: "Casas nuevas que empezaron a construirse — señal de demanda del mercado.",
      pt: "Casas novas que começaram a ser construídas — sinal de demanda do mercado.",
    },
  },

  // ---------- status ----------
  {
    id: "ai_generated",
    category: "status",
    term: { en: "AI draft", es: "Borrador de IA", pt: "Rascunho de IA" },
    short: {
      en: "A first estimate written by AI from your photos and notes. Review before sending.",
      es: "Un primer presupuesto que la IA redacta desde tus fotos y notas. Revísalo antes de enviar.",
      pt: "Um primeiro orçamento que a IA escreve das suas fotos e notas. Revise antes de enviar.",
    },
  },
  {
    id: "change_requested",
    category: "status",
    term: { en: "Change requested", es: "Cambio solicitado", pt: "Mudança solicitada" },
    short: {
      en: "The client asked for adjustments before approving.",
      es: "El cliente pidió ajustes antes de aprobar.",
      pt: "O cliente pediu ajustes antes de aprovar.",
    },
  },
  {
    id: "job",
    category: "status",
    term: { en: "Job", es: "Trabajo", pt: "Trabalho" },
    short: {
      en: "An approved estimate that is now work in progress.",
      es: "Un presupuesto aprobado que ya es trabajo en curso.",
      pt: "Um orçamento aprovado que já é trabalho em andamento.",
    },
  },
  {
    id: "approved",
    category: "status",
    term: { en: "Approved / Won", es: "Aprobado / Ganado", pt: "Aprovado / Ganho" },
    short: {
      en: "The client said yes — you got the work.",
      es: "El cliente dijo sí — conseguiste el trabajo.",
      pt: "O cliente disse sim — você fechou o trabalho.",
    },
  },
  {
    id: "lost",
    category: "status",
    term: { en: "Lost", es: "Perdido", pt: "Perdido" },
    short: {
      en: "The client declined or chose someone else.",
      es: "El cliente rechazó o eligió a otro.",
      pt: "O cliente recusou ou escolheu outro.",
    },
  },

  // ---------- money ----------
  {
    id: "invoice",
    category: "money",
    term: { en: "Invoice", es: "Factura", pt: "Fatura" },
    short: {
      en: "A bill you send the client for a payment that's due.",
      es: "Una cuenta que envías al cliente por un pago pendiente.",
      pt: "Uma conta que você envia ao cliente por um pagamento devido.",
    },
  },
  {
    id: "change_order",
    category: "money",
    term: { en: "Change order", es: "Orden de cambio", pt: "Ordem de mudança" },
    short: {
      en: "A signed add-on to the contract when the job scope grows mid-project.",
      es: "Un añadido firmado al contrato cuando el alcance crece a mitad del trabajo.",
      pt: "Um adendo assinado ao contrato quando o escopo cresce no meio do trabalho.",
    },
    long: {
      en: "Keeps extra work paid and documented instead of eating your profit. It updates the contract total.",
      es: "Mantiene el trabajo extra pagado y documentado en vez de comerse tu ganancia. Actualiza el total del contrato.",
      pt: "Mantém o trabalho extra pago e documentado em vez de comer seu lucro. Atualiza o total do contrato.",
    },
  },
  {
    id: "deposit",
    category: "money",
    term: { en: "Deposit", es: "Anticipo", pt: "Entrada / Sinal" },
    short: {
      en: "The first payment, taken before work starts (often 40%).",
      es: "El primer pago, antes de empezar (a menudo 40%).",
      pt: "O primeiro pagamento, antes de começar (geralmente 40%).",
    },
  },
  {
    id: "progress_payment",
    category: "money",
    term: { en: "Progress payment", es: "Pago por avance", pt: "Pagamento por etapa" },
    short: {
      en: "A middle payment as the job reaches milestones.",
      es: "Un pago intermedio al alcanzar hitos del trabajo.",
      pt: "Um pagamento intermediário ao atingir etapas do trabalho.",
    },
  },
  {
    id: "final_payment",
    category: "money",
    term: { en: "Final payment", es: "Pago final", pt: "Pagamento final" },
    short: {
      en: "The last payment, collected when the job is done.",
      es: "El último pago, al terminar el trabajo.",
      pt: "O último pagamento, ao concluir o trabalho.",
    },
  },
  {
    id: "job_cost",
    category: "money",
    term: { en: "Job cost", es: "Costo del trabajo", pt: "Custo do trabalho" },
    short: {
      en: "Real money spent on a job vs what you estimated — shows true profit.",
      es: "Dinero real gastado en un trabajo vs lo estimado — muestra la ganancia real.",
      pt: "Dinheiro real gasto num trabalho vs o estimado — mostra o lucro real.",
    },
  },

  // ---------- work ----------
  {
    id: "trade",
    category: "work",
    term: { en: "Trade", es: "Oficio", pt: "Serviço / Ofício" },
    short: {
      en: "The type of work: painting, framing, concrete, siding, etc.",
      es: "El tipo de trabajo: pintura, estructura, concreto, revestimiento, etc.",
      pt: "O tipo de trabalho: pintura, estrutura, concreto, revestimento, etc.",
    },
  },
  {
    id: "scope",
    category: "work",
    term: { en: "Scope", es: "Alcance", pt: "Escopo" },
    short: {
      en: "Exactly what's included in the job — and what isn't.",
      es: "Exactamente qué incluye el trabajo — y qué no.",
      pt: "Exatamente o que o trabalho inclui — e o que não inclui.",
    },
  },
  {
    id: "assumptions",
    category: "work",
    term: { en: "Assumptions", es: "Supuestos", pt: "Premissas" },
    short: {
      en: "What the price assumes to be true (e.g. walls in good shape).",
      es: "Lo que el precio da por cierto (ej. paredes en buen estado).",
      pt: "O que o preço assume como verdade (ex. paredes em bom estado).",
    },
  },
  {
    id: "line_item",
    category: "work",
    term: { en: "Line item", es: "Partida / Ítem", pt: "Item de linha" },
    short: {
      en: "One priced row on the estimate (a task or material).",
      es: "Una fila con precio en el presupuesto (tarea o material).",
      pt: "Uma linha com preço no orçamento (tarefa ou material).",
    },
  },
  {
    id: "takeoff",
    category: "work",
    term: { en: "Takeoff", es: "Cómputo / Takeoff", pt: "Levantamento / Takeoff" },
    short: {
      en: "Turning measurements into quantities of material and labor.",
      es: "Convertir medidas en cantidades de material y mano de obra.",
      pt: "Transformar medidas em quantidades de material e mão de obra.",
    },
  },
  {
    id: "egress",
    category: "work",
    term: { en: "Egress window", es: "Ventana de egreso", pt: "Janela de saída (egress)" },
    short: {
      en: "A window big enough to escape through — required by code for bedrooms/basements.",
      es: "Una ventana lo bastante grande para escapar — exigida por código en dormitorios/sótanos.",
      pt: "Uma janela grande o bastante para escapar — exigida por código em quartos/porões.",
    },
  },
  {
    id: "measure_mode",
    category: "work",
    term: { en: "Measure mode", es: "Modo de medida", pt: "Modo de medição" },
    short: {
      en: "How a trade is measured: floor area, wall area, linear feet, or footprint.",
      es: "Cómo se mide un oficio: área de piso, de pared, pies lineales o huella.",
      pt: "Como um serviço é medido: área de piso, de parede, pés lineares ou projeção.",
    },
  },

  // ---------- sections ----------
  {
    id: "dashboard",
    category: "sections",
    term: { en: "Dashboard (Home)", es: "Panel (Inicio)", pt: "Painel (Início)" },
    short: {
      en: "Your business at a glance: revenue, profit, cash, pipeline, win rate.",
      es: "Tu negocio de un vistazo: ingresos, ganancia, caja, pipeline, conversión.",
      pt: "Seu negócio num relance: receita, lucro, caixa, pipeline, conversão.",
    },
  },
  {
    id: "demand",
    category: "sections",
    term: { en: "Demand", es: "Demanda", pt: "Demanda" },
    short: {
      en: "Where your jobs come from and which trades sell most, by area.",
      es: "De dónde vienen tus trabajos y qué oficios venden más, por zona.",
      pt: "De onde vêm seus trabalhos e quais serviços mais vendem, por área.",
    },
  },
  {
    id: "market_pulse",
    category: "sections",
    term: { en: "Market pulse", es: "Pulso del mercado", pt: "Pulso do mercado" },
    short: {
      en: "National building-permit trends — is construction demand rising or cooling.",
      es: "Tendencias nacionales de permisos — si la demanda de construcción sube o baja.",
      pt: "Tendências nacionais de alvarás — se a demanda de construção sobe ou desce.",
    },
  },
  {
    id: "before_after",
    category: "sections",
    term: { en: "Before & after photos", es: "Fotos antes y después", pt: "Fotos antes e depois" },
    short: {
      en: "Job photos that prove quality and help sell the next client.",
      es: "Fotos del trabajo que prueban calidad y ayudan a vender al próximo cliente.",
      pt: "Fotos do trabalho que provam qualidade e ajudam a vender o próximo cliente.",
    },
  },
  {
    id: "traffic_light",
    category: "sections",
    term: { en: "Traffic light", es: "Semáforo", pt: "Semáforo" },
    short: {
      en: "Green/yellow/red health for a task or project — spot trouble early.",
      es: "Salud verde/amarillo/rojo de una tarea o proyecto — detecta problemas a tiempo.",
      pt: "Saúde verde/amarelo/vermelho de uma tarefa ou projeto — pega problema cedo.",
    },
  },
  {
    id: "proposal",
    category: "sections",
    term: { en: "Proposal", es: "Propuesta", pt: "Proposta" },
    short: {
      en: "The client-facing document you send to win the job — from an estimate.",
      es: "El documento para el cliente que envías para ganar el trabajo — desde un presupuesto.",
      pt: "O documento para o cliente que você envia para fechar o trabalho — a partir de um orçamento.",
    },
  },
];

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));

export function glossaryById(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}
