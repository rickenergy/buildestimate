import { createClient as createBareClient } from "@supabase/supabase-js";
import { getDict } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { ProposalAccept } from "@/components/proposal-accept";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CircleCheck } from "lucide-react";

interface ProposalData {
  proposal: {
    id: string;
    scope: string;
    exclusions: string;
    terms: string;
    valid_until: string | null;
    status: string;
    accepted_at: string | null;
    client_name_signed: string | null;
  };
  estimate: {
    title: string;
    trade: string;
    total: number;
    est_days: number | null;
    location: string | null;
  };
  contractor: {
    company_name: string;
    full_name: string;
    phone: string | null;
    logo_url: string | null;
    language: string;
  };
  client: { name: string } | null;
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Anonymous client — access is capability-based via the token (security definer RPC).
  const supabase = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("get_proposal_by_token", { p_token: token });

  const t = getDict((data as ProposalData | null)?.contractor?.language);

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">{t.proposal.notFound}</p>
      </main>
    );
  }

  const { proposal, estimate, contractor, client } = data as ProposalData;
  const lang = contractor.language;
  const expired =
    proposal.valid_until && new Date(proposal.valid_until) < new Date() && proposal.status !== "accepted";
  const accepted = proposal.status === "accepted";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 p-5 print:max-w-none print:p-0">
      <header className="flex items-center gap-3 border-b pb-4">
        {contractor.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contractor.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : null}
        <div>
          <h1 className="text-lg font-bold">{contractor.company_name || contractor.full_name}</h1>
          {contractor.phone && <p className="text-xs text-muted-foreground">{contractor.phone}</p>}
        </div>
      </header>

      <div>
        <p className="text-xs uppercase text-muted-foreground">{t.proposal.title}</p>
        <h2 className="text-xl font-bold">{estimate.title}</h2>
        {client && (
          <p className="text-sm text-muted-foreground">
            {t.proposal.preparedFor} <span className="font-medium">{client.name}</span>
          </p>
        )}
        {estimate.location && (
          <p className="text-sm text-muted-foreground">{estimate.location}</p>
        )}
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{t.proposal.investment}</p>
            <p className="text-2xl font-bold">{formatMoney(Number(estimate.total), lang)}</p>
          </div>
          {estimate.est_days && (
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">{t.proposal.estimatedDuration}</p>
              <p className="font-semibold">
                {Number(estimate.est_days)} {t.estimate.days}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Section title={t.proposal.scope} body={proposal.scope} />
      {proposal.exclusions && <Section title={t.proposal.exclusions} body={proposal.exclusions} />}
      {proposal.terms && <Section title={t.proposal.terms} body={proposal.terms} />}

      {proposal.valid_until && (
        <p className="text-xs text-muted-foreground">
          {t.proposal.validUntil}: {formatDate(proposal.valid_until, lang)}
        </p>
      )}

      <Separator className="print:hidden" />

      {accepted ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-6 text-center dark:bg-green-950">
          <CircleCheck className="h-10 w-10 text-green-600" />
          <p className="font-semibold text-green-700 dark:text-green-300">{t.proposal.accepted}</p>
          <p className="text-sm text-muted-foreground">
            {proposal.client_name_signed} · {t.proposal.acceptedOn}{" "}
            {proposal.accepted_at ? formatDate(proposal.accepted_at, lang) : ""}
          </p>
        </div>
      ) : expired ? (
        <p className="text-center text-sm text-muted-foreground">{t.proposal.expired}</p>
      ) : (
        <ProposalAccept
          token={token}
          labels={{
            title: t.proposal.acceptTitle,
            name: t.proposal.acceptName,
            button: t.proposal.acceptButton,
            pdf: t.proposal.downloadPdf,
          }}
        />
      )}

      <footer className="pb-8 pt-4 text-center text-[10px] text-muted-foreground">
        {t.proposal.preparedBy} {contractor.company_name || contractor.full_name} · BuildEstimate AI
      </footer>
    </main>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </section>
  );
}
