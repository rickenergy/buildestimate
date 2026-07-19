/**
 * Construction roles (crew positions). Used to structure the free-text
 * employee "role" field into suggestions and, later, role-based dashboards
 * and permissions (épico #1). Kept as suggestions (datalist) so existing
 * values and CSV imports keep working.
 */

export const CONSTRUCTION_ROLES = [
  "laborer",
  "inspector",
  "estimator",
  "safety_manager",
  "scheduler",
  "project_manager",
  "construction_manager",
  "superintendent",
  "foreman",
  "civil_engineer",
  "contractor",
] as const;

export type ConstructionRole = (typeof CONSTRUCTION_ROLES)[number];

export const ROLE_LABELS: Record<ConstructionRole, { en: string; pt: string; es: string }> = {
  laborer: { en: "Laborer", pt: "Ajudante", es: "Peón" },
  inspector: { en: "Inspector", pt: "Inspetor", es: "Inspector" },
  estimator: { en: "Estimator", pt: "Orçamentista", es: "Estimador" },
  safety_manager: { en: "Safety Manager", pt: "Gerente de Segurança", es: "Gerente de Seguridad" },
  scheduler: { en: "Scheduler", pt: "Programador", es: "Programador" },
  project_manager: { en: "Project Manager", pt: "Gerente de Obra", es: "Jefe de Proyecto" },
  construction_manager: { en: "Construction Manager", pt: "Gerente de Construção", es: "Gerente de Construcción" },
  superintendent: { en: "Superintendent", pt: "Superintendente", es: "Superintendente" },
  foreman: { en: "Foreman", pt: "Encarregado", es: "Capataz" },
  civil_engineer: { en: "Civil Engineer", pt: "Engenheiro Civil", es: "Ingeniero Civil" },
  contractor: { en: "Contractor", pt: "Empreiteiro", es: "Contratista" },
};

export function roleLabel(role: string, lang: "en" | "pt" | "es"): string {
  const l = ROLE_LABELS[role as ConstructionRole];
  return l ? (l[lang] ?? l.en) : role;
}

/** Localized suggestion labels for the employee role field (datalist). */
export function roleSuggestions(lang: "en" | "pt" | "es"): string[] {
  return CONSTRUCTION_ROLES.map((r) => ROLE_LABELS[r][lang] ?? ROLE_LABELS[r].en);
}
