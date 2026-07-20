import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { getMembership } from "@/lib/membership";
import { I18nProvider } from "@/components/providers";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { GuideFab } from "@/components/guide-fab";
import { OfflineSupport } from "@/components/offline-support";
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
  const membership = await getMembership();
  const memberMode = !!membership && !membership.isOwner;

  return (
    <I18nProvider dict={dict} lang={lang}>
      <OfflineSupport />
      <div className="flex w-full flex-1">
        <Sidebar memberMode={memberMode} />
        <div className="mx-auto w-full max-w-md flex-1 pb-24 md:max-w-3xl md:pb-8">{children}</div>
      </div>
      {!memberMode && <GuideFab />}
      <BottomNav memberMode={memberMode} />
    </I18nProvider>
  );
}
