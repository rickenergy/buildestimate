import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return <SettingsForm profile={profile as Profile} email={user!.email ?? ""} />;
}
