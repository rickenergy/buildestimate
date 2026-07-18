import { createClient as createBareClient } from "@supabase/supabase-js";
import { getDict } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { ProposalAccept } from "@/components/proposal-accept";
import { CircleCheck, Clock, MapPin, Ruler, ShieldCheck, Users } from "lucide-react";

interface ProposalItem {
  kind: string;
  description: string;
  qty: number;
  unit: string;
}

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
    area_sqft: number | null;
    crew_size: number | null;
  };
  contractor: {
    company_name: string;
    full_name: string;
    phone: string | null;
    logo_url: string | null;
    banner_url: string | null;
    banner_position: number | null;
    banner_zoom: number | null;
    company_address: string | null;
    company_email: string | null;
    license_number: string | null;
    language: string;
  };
  client: { name: string; address: string | null } | null;
  items: ProposalItem[];
}

/** Work groups shown to the client — scope detail, no per-line pricing. */
const GROUPS: { kinds: string[]; key: "material" | "labor" | "demoDisposal" }[] = [
  { kinds: ["material"], key: "material" },
  { kinds: ["labor", "other"], key: "labor" },
  { kinds: ["demo", "disposal"], key: "demoDisposal" },
];

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

  const { proposal, estimate, contractor, client, items } = data as ProposalData;
  const lang = contractor.language;
  const expired =
    proposal.valid_until &&
    new Date(proposal.valid_until) < new Date() &&
    proposal.status !== "accepted";
  const accepted = proposal.status === "accepted";
  const company = contractor.company_name || contractor.full_name;
  const total = Number(estimate.total);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      {/* ── Hero: banner + logo + company ───────────────────────── */}
      <header className="relative">
        {contractor.banner_url ? (
          <div className="relative h-44 w-full overflow-hidden sm:h-60 print:h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={contractor.banner_url}
              alt=""
              className="h-full w-full object-cover"
              style={{
                objectPosition: `center ${contractor.banner_position ?? 50}%`,
                transform: `scale(${(contractor.banner_zoom ?? 100) / 100})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          </div>
        ) : (
          <div className="h-28 w-full bg-gradient-to-br from-neutral-900 to-neutral-700 print:h-20" />
        )}

        <div className="mx-auto max-w-3xl px-5">
          <div className="-mt-10 flex items-end gap-4">
            {contractor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contractor.logo_url}
                alt={company}
                className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover shadow-lg ring-4 ring-white"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-2xl font-bold text-white shadow-lg ring-4 ring-white">
                {company.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <p className="text-2xl font-bold leading-tight">{company}</p>
              <p className="text-sm text-neutral-500">
                {[contractor.phone, contractor.company_email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-16">
        {/* ── The offer — big, unmissable ───────────────────────── */}
        <section className="pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            {t.proposal.title}
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {estimate.title}
          </h1>
          {client && (
            <p className="mt-3 text-lg text-neutral-600">
              {t.proposal.preparedFor}{" "}
              <span className="font-semibold text-neutral-900">{client.name}</span>
            </p>
          )}
          {(estimate.location || client?.address) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPin className="h-4 w-4" /> {estimate.location || client?.address}
            </p>
          )}
        </section>

        {/* ── Price — the hero number ───────────────────────────── */}
        <section className="mt-8 rounded-3xl bg-neutral-900 p-8 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {t.proposal.investment}
          </p>
          <p className="mt-2 text-5xl font-bold tracking-tight sm:text-6xl">
            {formatMoney(total, lang)}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 text-sm">
            {estimate.est_days != null && (
              <Fact
                icon={<Clock className="h-4 w-4" />}
                label={t.proposal.estimatedDuration}
                value={`${Number(estimate.est_days)} ${t.estimate.days}`}
              />
            )}
            {estimate.area_sqft != null && (
              <Fact
                icon={<Ruler className="h-4 w-4" />}
                label="sqft"
                value={`${Number(estimate.area_sqft)}`}
              />
            )}
            {estimate.crew_size != null && (
              <Fact
                icon={<Users className="h-4 w-4" />}
                label={t.estimate.people}
                value={`${Number(estimate.crew_size)}`}
              />
            )}
          </div>
        </section>

        {/* ── Scope narrative ───────────────────────────────────── */}
        {proposal.scope && (
          <Block title={t.proposal.scope}>
            <p className="whitespace-pre-wrap text-lg leading-relaxed text-neutral-700">
              {proposal.scope}
            </p>
          </Block>
        )}

        {/* ── Detailed work breakdown (no per-line pricing) ─────── */}
        {items.length > 0 && (
          <Block title={t.estimate.title}>
            <div className="space-y-6">
              {GROUPS.map(({ kinds, key }) => {
                const rows = items.filter((i) => kinds.includes(i.kind));
                if (rows.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      {t.estimate[key]}
                    </p>
                    <ul className="space-y-2">
                      {rows.map((item, i) => (
                        <li
                          key={`${key}-${i}`}
                          className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-2"
                        >
                          <span className="flex items-start gap-2 text-neutral-800">
                            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            {item.description}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-sm text-neutral-500">
                            {Number(item.qty)} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Block>
        )}

        {proposal.exclusions && (
          <Block title={t.proposal.exclusions}>
            <p className="whitespace-pre-wrap leading-relaxed text-neutral-600">
              {proposal.exclusions}
            </p>
          </Block>
        )}

        {proposal.terms && (
          <Block title={t.proposal.terms}>
            <p className="whitespace-pre-wrap leading-relaxed text-neutral-600">{proposal.terms}</p>
          </Block>
        )}

        {/* ── Trust strip ───────────────────────────────────────── */}
        <section className="mt-10 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-600">
          <p className="flex items-center gap-2 font-semibold text-neutral-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> {company}
          </p>
          <div className="mt-2 space-y-0.5">
            {contractor.company_address && <p>{contractor.company_address}</p>}
            {contractor.phone && <p>{contractor.phone}</p>}
            {contractor.company_email && <p>{contractor.company_email}</p>}
            {contractor.license_number && (
              <p className="font-medium text-neutral-700">Lic. {contractor.license_number}</p>
            )}
          </div>
          {proposal.valid_until && (
            <p className="mt-3 text-xs text-neutral-500">
              {t.proposal.validUntil}: {formatDate(proposal.valid_until, lang)}
            </p>
          )}
        </section>

        {/* ── Close ─────────────────────────────────────────────── */}
        <section className="mt-8">
          {accepted ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-emerald-50 p-8 text-center">
              <CircleCheck className="h-12 w-12 text-emerald-600" />
              <p className="text-xl font-bold text-emerald-800">{t.proposal.accepted}</p>
              <p className="text-sm text-emerald-700">
                {proposal.client_name_signed} · {t.proposal.acceptedOn}{" "}
                {proposal.accepted_at ? formatDate(proposal.accepted_at, lang) : ""}
              </p>
            </div>
          ) : expired ? (
            <p className="rounded-2xl bg-neutral-100 p-6 text-center text-neutral-500">
              {t.proposal.expired}
            </p>
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
        </section>

        <footer className="pt-10 text-center text-[11px] text-neutral-400">
          {t.proposal.preparedBy} {company} · ContractorOS AI
        </footer>
      </div>
    </main>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="flex items-center gap-1 text-white/50">{icon}</span>
      <p className="mt-1 text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
