import { createClient } from "@/lib/supabase/server";
import { GuideView } from "@/components/guide-view";
import type { GLang } from "@/lib/glossary";

export default async function GuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user!.id)
    .single();
  const lang = ((profile?.language as string) ?? "en") as GLang;

  return <GuideView lang={lang} />;
}
