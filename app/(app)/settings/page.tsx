import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import { CompanyCredentials } from "@/components/company-credentials";
import type { Profile, CompanyLicense, CompanyInsurance } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: licenses }, { data: insurances }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("company_licenses").select("*").eq("user_id", user!.id).order("created_at"),
    supabase.from("company_insurances").select("*").eq("user_id", user!.id).order("created_at"),
  ]);

  return (
    <>
      <SettingsForm profile={profile as Profile} email={user!.email ?? ""} />
      <div className="mx-auto max-w-md px-4 pb-6 -mt-2">
        <CompanyCredentials
          licenses={(licenses ?? []) as CompanyLicense[]}
          insurances={(insurances ?? []) as CompanyInsurance[]}
        />
      </div>
    </>
  );
}
