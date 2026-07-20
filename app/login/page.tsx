"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

// Login page renders before we know the user's language — show trilingual hints.
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show the Google button once the provider is actually configured in
  // Supabase, so users never hit "provider is not enabled".
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  // Honor ?next=/i/<token> (invite links) — same-origin paths only.
  const nextPath = () => {
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/home";
  };

  async function googleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "signup" && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError("Emails don't match / Os emails não coincidem / Los correos no coinciden");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match / As senhas não coincidem / Las contraseñas no coinciden");
      return;
    }
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy / Aceite os Termos / Acepta los Términos");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(nextPath());
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        // record acceptance timestamp — best-effort, never blocks the flow
        await supabase
          .from("profiles")
          .update({ terms_accepted_at: new Date().toISOString() })
          .eq("id", data.user!.id);
        router.push(nextPath());
        router.refresh();
      } else {
        // Email confirmation is off — no link is sent. Send them to sign in.
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setMessage(
          "Account created! Sign in below. / Conta criada! Faça login abaixo. / ¡Cuenta creada! Inicia sesión."
        );
        setLoading(false);
      }
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first / Informe seu email / Ingresa tu email");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) {
      // Email delivery failures come back opaque (e.g. 500) — show a friendly,
      // actionable message instead of a raw error object.
      const raw = typeof error.message === "string" ? error.message : "";
      const emailIssue = !raw || raw === "{}" || /sending|smtp|email|500/i.test(raw);
      setError(
        emailIssue
          ? "Couldn't send the email. Check your email settings and try again. / Não deu para enviar o email. Verifique a configuração de email e tente de novo. / No se pudo enviar el correo. Revisa la configuración e inténtalo de nuevo."
          : raw
      );
      return;
    }
    setMessage(
      "Reset link sent — check your email. / Link enviado — veja seu email. / Enlace enviado — revisa tu correo."
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <Image src="/icon.svg" alt="ContractorOS AI" width={72} height={72} className="rounded-2xl" />
        <h1 className="text-2xl font-bold">ContractorOS AI</h1>
        <p className="text-center text-sm text-muted-foreground max-w-xs">
          Photos, measurements or voice → professional estimate in minutes
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "signin" ? "Sign in / Entrar" : "Create account / Criar conta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name / Nome</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="confirmEmail">Confirm email / Confirmar email</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  required
                  autoComplete="off"
                  placeholder="Re-type to avoid typos / Redigite p/ evitar erro"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password / Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="confirm">Confirm password / Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}

            {mode === "signup" && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-primary underline">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </a>
                  . / Aceito os Termos e a Política de Privacidade.
                </span>
              </label>
            )}

            {mode === "signin" && (
              <button
                type="button"
                onClick={forgotPassword}
                className="-mt-1 self-end text-xs text-muted-foreground underline"
              >
                Forgot password? / Esqueci minha senha
              </button>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "…" : mode === "signin" ? "Sign in / Entrar" : "Create account / Criar conta"}
            </Button>
          </form>

          {googleEnabled && (
          <>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or / ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={googleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google / Entrar com Google
          </Button>
          </>
          )}

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signin"
              ? "No account? Create one / Sem conta? Crie uma"
              : "Already have an account? Sign in / Já tem conta? Entre"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
