"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/providers";
import { MailWarning, X, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  msg: {
    en: "Confirm your email so you can reset your password if you forget it.",
    pt: "Confirme seu email para poder recuperar a senha se esquecer.",
    es: "Confirma tu correo para poder recuperar tu contraseña si la olvidas.",
  },
  send: { en: "Send confirmation", pt: "Enviar confirmação", es: "Enviar confirmación" },
  sent: {
    en: "Confirmation email sent — check your inbox.",
    pt: "Email de confirmação enviado — veja sua caixa de entrada.",
    es: "Correo de confirmación enviado — revisa tu bandeja.",
  },
  fail: {
    en: "Couldn't send now — try again later.",
    pt: "Não deu para enviar agora — tente mais tarde.",
    es: "No se pudo enviar ahora — inténtalo más tarde.",
  },
} as const;

/**
 * Non-blocking nudge shown when the logged-in user's email isn't confirmed
 * yet (e.g. signup with email confirmation OFF). Dismissible for the session.
 * Renders nothing when already confirmed.
 */
export function VerifyEmailBanner({ email, confirmed }: { email: string; confirmed: boolean }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);

  if (confirmed || hidden) return null;

  async function resend() {
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) toast.error(tr(L.fail));
    else {
      toast.success(tr(L.sent));
      setHidden(true);
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{tr(L.msg)}</span>
      <button
        onClick={resend}
        disabled={sending}
        className="press shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 font-semibold hover:bg-amber-500/30"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tr(L.send)}
      </button>
      <button onClick={() => setHidden(true)} className="press shrink-0 p-1" aria-label="dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
