/**
 * App map — the single source of "what lives where and what it's for".
 * Powers the guide's "Map" section so the user never gets lost.
 * Client-safe: plain data, trilingual.
 */

export type MapLang = "en" | "pt" | "es";
type Tri = Record<MapLang, string>;

export interface AppMapItem {
  href: string;
  title: Tri;
  desc: Tri;
}

export interface AppMapGroup {
  id: string;
  title: Tri;
  items: AppMapItem[];
}

export const APP_MAP: AppMapGroup[] = [
  {
    id: "sell",
    title: { en: "Sell", pt: "Vender", es: "Vender" },
    items: [
      {
        href: "/estimate/new",
        title: { en: "New estimate", pt: "Novo estimate", es: "Nuevo estimado" },
        desc: {
          en: "Wizard, quick form or AI from photos — start every job here.",
          pt: "Wizard, formulário rápido ou IA por fotos — todo trabalho começa aqui.",
          es: "Wizard, formulario rápido o IA con fotos — todo trabajo empieza aquí.",
        },
      },
      {
        href: "/estimates",
        title: { en: "Estimates", pt: "Estimates", es: "Estimados" },
        desc: {
          en: "Every quote and its status: draft → sent → approved.",
          pt: "Todos os orçamentos e seus status: rascunho → enviado → aprovado.",
          es: "Todos los presupuestos y su estado: borrador → enviado → aprobado.",
        },
      },
      {
        href: "/clients",
        title: { en: "Clients", pt: "Clientes", es: "Clientes" },
        desc: {
          en: "Leads and customers, contact shortcuts, history.",
          pt: "Leads e clientes, atalhos de contato, histórico.",
          es: "Leads y clientes, atajos de contacto, historial.",
        },
      },
      {
        href: "/demand",
        title: { en: "Dashboards", pt: "Dashboards", es: "Dashboards" },
        desc: {
          en: "Business, market pulse and per-role views (pipeline, margin, safety…).",
          pt: "Negócio, mercado e visões por cargo (funil, margem, segurança…).",
          es: "Negocio, mercado y vistas por rol (embudo, margen, seguridad…).",
        },
      },
    ],
  },
  {
    id: "estimate",
    title: { en: "Price it right", pt: "Precificar certo", es: "Precificar bien" },
    items: [
      {
        href: "/prices",
        title: { en: "Price book", pt: "Catálogo de preços", es: "Catálogo de precios" },
        desc: {
          en: "Your unit costs per service. The AI never invents your numbers.",
          pt: "Seus custos unitários por serviço. A IA nunca inventa seus números.",
          es: "Tus costos unitarios por servicio. La IA nunca inventa tus números.",
        },
      },
      {
        href: "/inventory",
        title: { en: "Inventory", pt: "Estoque", es: "Inventario" },
        desc: {
          en: "Stock, low-stock alerts and the cheapest store per item.",
          pt: "Estoque, alerta de reposição e a loja mais barata por item.",
          es: "Stock, alertas de reposición y la tienda más barata por artículo.",
        },
      },
      {
        href: "/retail-stores",
        title: { en: "Stores", pt: "Lojas", es: "Tiendas" },
        desc: {
          en: "Where you buy — feeds price comparison on inventory.",
          pt: "Onde você compra — alimenta a comparação de preços do estoque.",
          es: "Dónde compras — alimenta la comparación de precios.",
        },
      },
      {
        href: "/suppliers",
        title: { en: "Suppliers", pt: "Fornecedores", es: "Proveedores" },
        desc: {
          en: "Wholesale contacts and accounts.",
          pt: "Contatos e contas de fornecedores.",
          es: "Contactos y cuentas de proveedores.",
        },
      },
    ],
  },
  {
    id: "run",
    title: { en: "Run the job", pt: "Executar a obra", es: "Ejecutar la obra" },
    items: [
      {
        href: "/projects",
        title: { en: "Projects", pt: "Projetos", es: "Proyectos" },
        desc: {
          en: "Group jobs by property, assign the team, follow progress.",
          pt: "Agrupe serviços por imóvel, atribua a equipe, acompanhe o progresso.",
          es: "Agrupa trabajos por propiedad, asigna el equipo, sigue el avance.",
        },
      },
      {
        href: "/finance",
        title: { en: "Job finance", pt: "Financeiro da obra", es: "Finanzas de obra" },
        desc: {
          en: "Expenses with photo/receipt, waste tracking, real profit per job.",
          pt: "Gastos com foto/nota, desperdício, lucro real por serviço.",
          es: "Gastos con foto/recibo, desperdicio, ganancia real por trabajo.",
        },
      },
      {
        href: "/incidents",
        title: { en: "Incidents", pt: "Incidentes", es: "Incidentes" },
        desc: {
          en: "Problems on site by severity, owner and follow-up.",
          pt: "Problemas na obra por severidade, responsável e acompanhamento.",
          es: "Problemas en obra por severidad, responsable y seguimiento.",
        },
      },
    ],
  },
  {
    id: "team",
    title: { en: "Team & partners", pt: "Equipe & parceiros", es: "Equipo & socios" },
    items: [
      {
        href: "/settings/team",
        title: { en: "Team & access", pt: "Equipe & acesso", es: "Equipo & acceso" },
        desc: {
          en: "Invite people by link and control what each profile sees.",
          pt: "Convide por link e controle o que cada perfil vê.",
          es: "Invita por enlace y controla qué ve cada perfil.",
        },
      },
      {
        href: "/employees",
        title: { en: "Employees", pt: "Funcionários", es: "Empleados" },
        desc: {
          en: "Crew records, roles and pay rates.",
          pt: "Cadastro da equipe, funções e diárias.",
          es: "Registro del equipo, roles y tarifas.",
        },
      },
      {
        href: "/subcontractors",
        title: { en: "Subcontractors", pt: "Subcontratados", es: "Subcontratistas" },
        desc: {
          en: "Partners with license/insurance — share estimates for a yes/no.",
          pt: "Parceiros com licença/seguro — compartilhe estimates pra sim/não.",
          es: "Socios con licencia/seguro — comparte estimados para sí/no.",
        },
      },
    ],
  },
  {
    id: "setup",
    title: { en: "Set up", pt: "Configurar", es: "Configurar" },
    items: [
      {
        href: "/settings",
        title: { en: "Settings", pt: "Configurações", es: "Ajustes" },
        desc: {
          en: "Branding, licenses & insurance, margins, notifications, plan.",
          pt: "Marca, licenças & seguros, margens, notificações, plano.",
          es: "Marca, licencias & seguros, márgenes, notificaciones, plan.",
        },
      },
      {
        href: "/settings/billing",
        title: { en: "Plan & billing", pt: "Plano & assinatura", es: "Plan & facturación" },
        desc: {
          en: "Free vs Pro, trial status, upgrade.",
          pt: "Grátis vs Pro, status do teste, assinar.",
          es: "Gratis vs Pro, estado de prueba, mejorar.",
        },
      },
    ],
  },
];
