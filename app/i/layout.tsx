import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { I18nProvider } from "@/components/providers";
import type { Language } from "@/lib/types";

/** Public invite pages need the i18n provider (they render client components). */
export default async function InviteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let lang: Language = "en";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single();
    lang = (profile?.language ?? "en") as Language;
  }

  return (
    <I18nProvider dict={getDict(lang)} lang={lang}>
      {children}
    </I18nProvider>
  );
}
