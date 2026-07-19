"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { acceptInvite } from "@/app/actions/team";
import { UserPlus, Loader2, LogIn, CheckCircle2, XCircle } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  invited: { en: "You've been invited", pt: "Você foi convidado", es: "Has sido invitado" },
  toJoin: {
    en: "Join this company's ContractorOS workspace.",
    pt: "Entre no espaço da empresa no ContractorOS.",
    es: "Únete al espacio de la empresa en ContractorOS.",
  },
  loginFirst: {
    en: "Log in or create your account first, then reopen this link to accept.",
    pt: "Entre ou crie sua conta primeiro, depois reabra este link para aceitar.",
    es: "Inicia sesión o crea tu cuenta primero, luego reabre este enlace para aceptar.",
  },
  login: { en: "Log in / Sign up", pt: "Entrar / Cadastrar", es: "Iniciar sesión / Registrarse" },
  accept: { en: "Accept invite", pt: "Aceitar convite", es: "Aceptar invitación" },
  ok: { en: "You're in! Redirecting…", pt: "Você entrou! Redirecionando…", es: "¡Adentro! Redirigiendo…" },
  expired: { en: "This invite has expired.", pt: "Este convite expirou.", es: "Esta invitación expiró." },
  used: { en: "This invite was already used.", pt: "Este convite já foi usado.", es: "Esta invitación ya fue usada." },
  notFound: { en: "Invite not found.", pt: "Convite não encontrado.", es: "Invitación no encontrada." },
  self: { en: "That's your own company.", pt: "Essa é a sua própria empresa.", es: "Esa es tu propia empresa." },
  error: { en: "Something went wrong.", pt: "Algo deu errado.", es: "Algo salió mal." },
} as const;

export function InviteAccept({ token, isLoggedIn }: { token: string; isLoggedIn: boolean }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function accept() {
    startTransition(async () => {
      const res = await acceptInvite(token);
      setStatus(res);
      if (res === "ok") setTimeout(() => router.push("/home"), 1200);
    });
  }

  const msg: Record<string, { m: Record<Lang, string>; ok?: boolean }> = {
    ok: { m: L.ok, ok: true },
    expired: { m: L.expired },
    already_used: { m: L.used },
    not_found: { m: L.notFound },
    self: { m: L.self },
    error: { m: L.error },
    auth_required: { m: L.loginFirst },
  };

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UserPlus className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-bold">{tr(L.invited)}</h1>
        <p className="text-sm text-muted-foreground">{tr(L.toJoin)}</p>
      </div>

      {status && msg[status] && (
        <p
          className={
            "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm " +
            (msg[status].ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300")
          }
        >
          {msg[status].ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {tr(msg[status].m)}
        </p>
      )}

      {status !== "ok" &&
        (isLoggedIn ? (
          <Button className="w-full" disabled={pending} onClick={accept}>
            {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            {tr(L.accept)}
          </Button>
        ) : (
          <div className="grid w-full gap-2">
            <p className="text-xs text-muted-foreground">{tr(L.loginFirst)}</p>
            <Link
              href={`/login?next=/invite/${token}`}
              className="press flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              <LogIn className="h-4 w-4" /> {tr(L.login)}
            </Link>
          </div>
        ))}
    </main>
  );
}
