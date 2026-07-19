import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership";
import { SettingsForm } from "@/components/settings-form";
import { CompanyCredentials } from "@/components/company-credentials";
import { PlanCard } from "@/components/premium-badge";
import { PushToggle } from "@/components/push-toggle";
import type { Profile, CompanyLicense, CompanyInsurance } from "@/lib/types";

const TEAM_LABEL: Record<string, { title: string; sub: string }> = {
  en: { title: "Team & access", sub: "Invite people, set what each can see" },
  pt: { title: "Equipe & acesso", sub: "Convide pessoas, defina o que cada uma vê" },
  es: { title: "Equipo & acceso", sub: "Invita personas, define qué ve cada una" },
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: licenses }, { data: insurances }, membership] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("company_licenses").select("*").eq("user_id", user!.id).order("created_at"),
    supabase.from("company_insurances").select("*").eq("user_id", user!.id).order("created_at"),
    getMembership(),
  ]);
  const lang = ((profile as Profile)?.language as string) ?? "en";
  const teamLabel = TEAM_LABEL[lang] ?? TEAM_LABEL.en;
  const isOwner = membership?.isOwner ?? true;

  return (
    <>
      <SettingsForm profile={profile as Profile} email={user!.email ?? ""} />
      <div className="mx-auto max-w-md px-4 pb-2 -mt-2">
        <PlanCard profile={profile as Profile} />
      </div>
      <div className="mx-auto max-w-md px-4 pb-2">
        <PushToggle />
      </div>
      {isOwner && (
      <div className="mx-auto max-w-md px-4 pb-2">
        <Link
          href="/settings/team"
          className="press flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs hover:bg-muted"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{teamLabel.title}</p>
            <p className="text-xs text-muted-foreground">{teamLabel.sub}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
      )}
      <div className="mx-auto max-w-md px-4 pb-6">
        <CompanyCredentials
          licenses={(licenses ?? []) as CompanyLicense[]}
          insurances={(insurances ?? []) as CompanyInsurance[]}
        />
      </div>
    </>
  );
}
