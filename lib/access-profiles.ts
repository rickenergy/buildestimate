/**
 * Access profiles — client-safe types & labels (no server imports).
 * The server-only resolver lives in lib/membership.ts. See docs/roles-matrix.md.
 */

export type AccessProfile =
  | "owner"
  | "project_manager"
  | "sales"
  | "estimator"
  | "field"
  | "crew"
  | "subcontractor";

export const PROFILE_LABELS: Record<AccessProfile, { en: string; pt: string; es: string }> = {
  owner: { en: "Owner / GC", pt: "Dono / GC", es: "Dueño / GC" },
  project_manager: { en: "Project Manager", pt: "Gerente de Projetos", es: "Jefe de Proyecto" },
  sales: { en: "Sales", pt: "Vendedor", es: "Vendedor" },
  estimator: { en: "Estimator", pt: "Orçamentista", es: "Estimador" },
  field: { en: "Field / Supervisor", pt: "Campo / Supervisor", es: "Campo / Supervisor" },
  crew: { en: "Crew", pt: "Equipe", es: "Cuadrilla" },
  subcontractor: { en: "Subcontractor", pt: "Subcontratado", es: "Subcontratista" },
};

/** Profiles the owner can invite (everything except owner). */
export const INVITABLE_PROFILES: AccessProfile[] = [
  "project_manager",
  "sales",
  "estimator",
  "field",
  "crew",
  "subcontractor",
];
