"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/components/providers";
import {
  createInvite,
  revokeInvite,
  removeMember,
  updateMemberProfile,
} from "@/app/actions/team";
import {
  INVITABLE_PROFILES,
  PROFILE_LABELS,
  type AccessProfile,
} from "@/lib/access-profiles";
import { Users, Plus, Trash2, Copy, Check, UserPlus } from "lucide-react";

type Lang = "en" | "pt" | "es";

export interface MemberRow {
  id: string;
  access_profile: AccessProfile;
  employee_name: string | null;
  created_at: string;
}
export interface InviteRow {
  id: string;
  label: string | null;
  access_profile: AccessProfile;
  token: string;
  created_at: string;
}

const L = {
  title: { en: "Team & access", pt: "Equipe & acesso", es: "Equipo & acceso" },
  subtitle: {
    en: "Invite people and set what each one can see.",
    pt: "Convide pessoas e defina o que cada uma pode ver.",
    es: "Invita personas y define qué puede ver cada una.",
  },
  invite: { en: "Invite someone", pt: "Convidar alguém", es: "Invitar a alguien" },
  name: { en: "Name (optional)", pt: "Nome (opcional)", es: "Nombre (opcional)" },
  profile: { en: "Access profile", pt: "Perfil de acesso", es: "Perfil de acceso" },
  generate: { en: "Generate invite link", pt: "Gerar link de convite", es: "Generar enlace" },
  pending: { en: "Pending invites", pt: "Convites pendentes", es: "Invitaciones pendientes" },
  members: { en: "Members", pt: "Membros", es: "Miembros" },
  copy: { en: "Copy link", pt: "Copiar link", es: "Copiar enlace" },
  copied: { en: "Copied!", pt: "Copiado!", es: "¡Copiado!" },
  share: {
    en: "Share this link with the person — they log in and get this access.",
    pt: "Compartilhe este link com a pessoa — ela entra e ganha este acesso.",
    es: "Comparte este enlace con la persona — inicia sesión y obtiene este acceso.",
  },
  noMembers: { en: "No members yet.", pt: "Nenhum membro ainda.", es: "Sin miembros aún." },
  noInvites: { en: "No pending invites.", pt: "Nenhum convite pendente.", es: "Sin invitaciones pendientes." },
} as const;

export function TeamManager({
  members,
  invites,
  baseUrl,
}: {
  members: MemberRow[];
  invites: InviteRow[];
  baseUrl: string;
}) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const pl = (p: AccessProfile) => PROFILE_LABELS[p][lang] ?? PROFILE_LABELS[p].en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [profile, setProfile] = useState<AccessProfile>("field");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const linkFor = (token: string) => `${baseUrl}/invite/${token}`;

  function generate() {
    startTransition(async () => {
      const res = await createInvite({ label: label || undefined, profile });
      if (res.ok && res.token) {
        setLastLink(linkFor(res.token));
        setLabel("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  async function copy(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-primary" /> {tr(L.title)}
        </h1>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </header>

      {/* Create invite */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> {tr(L.invite)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Input placeholder={tr(L.name)} value={label} onChange={(e) => setLabel(e.target.value)} />
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as AccessProfile)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {INVITABLE_PROFILES.map((p) => (
              <option key={p} value={p}>
                {pl(p)}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={pending} onClick={generate}>
            <Plus className="mr-1 h-4 w-4" /> {tr(L.generate)}
          </Button>
          {lastLink && (
            <div className="grid gap-1 rounded-lg bg-emerald-500/10 p-2 text-xs">
              <p className="text-muted-foreground">{tr(L.share)}</p>
              <div className="flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1">{lastLink}</code>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => copy(lastLink, "last")}>
                  {copiedId === "last" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tr(L.pending)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr(L.noInvites)}</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inv.label || pl(inv.access_profile)}</p>
                  <p className="text-xs text-muted-foreground">{pl(inv.access_profile)}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(linkFor(inv.token), inv.id)}>
                  {copiedId === inv.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await revokeInvite(inv.id); router.refresh(); })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tr(L.members)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr(L.noMembers)}</p>
          ) : (
            members.map((mem) => (
              <div key={mem.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{mem.employee_name || pl(mem.access_profile)}</p>
                </div>
                <select
                  value={mem.access_profile}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(async () => {
                      await updateMemberProfile(mem.id, e.target.value as AccessProfile);
                      router.refresh();
                    })
                  }
                  className="h-8 rounded-md border bg-background px-1.5 text-xs"
                >
                  {INVITABLE_PROFILES.map((p) => (
                    <option key={p} value={p}>
                      {pl(p)}
                    </option>
                  ))}
                </select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await removeMember(mem.id); router.refresh(); })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
