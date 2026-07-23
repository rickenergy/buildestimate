import { PageHeader } from "@/components/page-header";
import { MaterialReference } from "@/components/material-reference";
import { createClient } from "@/lib/supabase/server";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("language").eq("id", user.id).single()
    : { data: null };
  const lang = (profile?.language as string) ?? "en";
  const title = { en: "Material guide", pt: "Guia de material", es: "Guía de material" }[lang] ?? "Material guide";
  const subtitle =
    { en: "Suggested material per service", pt: "Material sugerido por serviço", es: "Material sugerido por servicio" }[lang] ??
    "Suggested material per service";

  return (
    <div className="pb-24">
      <PageHeader title={title} subtitle={subtitle} backHref="/home" />
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <MaterialReference />
      </div>
    </div>
  );
}
