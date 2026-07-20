"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSignature, Loader2, CheckCircle2 } from "lucide-react";

/** Public signature block — trilingual inline (no session, language unknown). */
export function ContractSign({ token }: { token: string }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sign() {
    startTransition(async () => {
      const { data, error } = await supabase.rpc("sign_sub_contract", {
        p_token: token,
        p_signed_name: name.trim(),
      });
      setStatus(error ? "error" : ((data as string) ?? "error"));
    });
  }

  if (status === "ok") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold">Signed! / Assinado! / ¡Firmado!</p>
        <p className="text-sm text-muted-foreground">
          Both parties will keep a copy of this agreement. / Ambas as partes guardam uma cópia. / Ambas
          partes guardan una copia.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl border p-4">
      <p className="text-sm font-semibold">
        Sign this agreement / Assinar este contrato / Firmar este contrato
      </p>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type your full legal name / Digite seu nome completo / Escribe tu nombre completo"
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          I have read and agree to the terms above; typing my name is my electronic signature. / Li e
          concordo com os termos acima; digitar meu nome é minha assinatura eletrônica. / He leído y
          acepto los términos; escribir mi nombre es mi firma electrónica.
        </span>
      </label>
      {status && status !== "ok" && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {status === "already_signed"
            ? "Already signed. / Já assinado. / Ya firmado."
            : status === "void"
              ? "This contract was voided. / Contrato cancelado. / Contrato anulado."
              : "Something went wrong — try again. / Algo deu errado — tente de novo. / Algo salió mal."}
        </p>
      )}
      <Button className="w-full" disabled={pending || !agree || name.trim().length < 2} onClick={sign}>
        {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSignature className="mr-1 h-4 w-4" />}
        Sign / Assinar / Firmar
      </Button>
    </div>
  );
}
