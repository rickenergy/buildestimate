import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { I18nProvider } from "@/components/providers";
import { BottomNav } from "@/components/bottom-nav";
import { GuideFab } from "@/components/guide-fab";
import type { Language } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();

  const lang = (profile?.language ?? "en") as Language;
  const dict = getDict(lang);

  return (
    <I18nProvider dict={dict} lang={lang}>
      <div className="mx-auto w-full max-w-md flex-1 pb-24 md:max-w-2xl">{children}</div>
      <GuideFab />
      <BottomNav />
    </I18nProvider>
  );
}
