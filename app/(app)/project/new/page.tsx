import { ProjectForm } from "@/components/project-form";
import type { ProjectType } from "@/lib/types";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const defaultType: ProjectType | undefined =
    type === "commercial" || type === "residential" || type === "mixed" ? type : undefined;
  return <ProjectForm defaultType={defaultType} />;
}
