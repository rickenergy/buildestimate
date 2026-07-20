import { createClient as createBareClient } from "@supabase/supabase-js";
import { ContractSign } from "@/components/contract-sign";
import { FileSignature, Building2, CheckCircle2 } from "lucide-react";

interface ContractData {
  contract: {
    title: string;
    scope: string;
    amount: number;
    payment_terms: string | null;
    retainage_pct: number;
    start_date: string | null;
    end_date: string | null;
    terms: string;
    status: string;
    signed_name: string | null;
    signed_at: string | null;
    created_at: string;
  };
  subcontractor: { name: string; company: string | null; trade: string | null };
  contractor: {
    company_name: string;
    full_name: string;
    phone: string | null;
    company_email: string | null;
    logo_url: string | null;
  };
}

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("get_sub_contract_by_token", { p_token: token });
  const d = data as ContractData | null;

  if (!d?.contract) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <FileSignature className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">Contract not found / Contrato não encontrado / Contrato no encontrado</p>
        </div>
      </main>
    );
  }

  const c = d.contract;
  const money = (n: number) =>
    Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      {/* Header */}
      <header className="space-y-1 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold">{d.contractor.company_name || d.contractor.full_name}</h1>
        <p className="text-sm text-muted-foreground">Subcontractor Agreement</p>
      </header>

      {/* Summary card */}
      <section className="grid grid-cols-2 gap-2 rounded-2xl border p-4 text-sm">
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Project / Projeto</p>
          <p className="font-semibold">{c.title}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Subcontractor</p>
          <p className="font-medium">{d.subcontractor.company || d.subcontractor.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amount / Valor</p>
          <p className="text-lg font-bold text-primary">{money(c.amount)}</p>
        </div>
        {c.start_date && (
          <div>
            <p className="text-xs text-muted-foreground">Start / Início</p>
            <p className="font-medium">{c.start_date}</p>
          </div>
        )}
        {c.end_date && (
          <div>
            <p className="text-xs text-muted-foreground">End / Fim</p>
            <p className="font-medium">{c.end_date}</p>
          </div>
        )}
        {Number(c.retainage_pct) > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Retainage / Retenção</p>
            <p className="font-medium">{Number(c.retainage_pct)}%</p>
          </div>
        )}
      </section>

      {/* Full terms */}
      <section className="rounded-2xl border p-4">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{c.terms}</pre>
      </section>

      {/* Signature */}
      {c.status === "signed" ? (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="font-semibold">Signed / Assinado / Firmado</p>
          <p className="text-sm text-muted-foreground">
            ✍️ {c.signed_name} · {c.signed_at?.slice(0, 10)}
          </p>
        </div>
      ) : c.status === "void" ? (
        <p className="rounded-2xl border p-4 text-center text-sm text-muted-foreground">
          This contract is no longer active. / Este contrato não está mais ativo. / Este contrato ya no
          está activo.
        </p>
      ) : (
        <ContractSign token={token} />
      )}

      <p className="pb-6 text-center text-[10px] text-muted-foreground">
        Generated with ContractorOS AI · Not legal advice — review with an attorney.
      </p>
    </main>
  );
}
