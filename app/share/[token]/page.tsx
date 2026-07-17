import { createClient as createBareClient } from "@supabase/supabase-js";
import { getDict } from "@/lib/i18n";
import { ShareRespond } from "@/components/share-respond";
import { CircleCheck, MapPin, Clock, Ruler } from "lucide-react";

interface ShareData {
  share: { status: string; custom_message: string | null; sub_name: string | null };
  estimate: {
    title: string;
    trade: string;
    location: string | null;
    area_sqft: number | null;
    est_days: number | null;
  };
  contractor: { company_name: string; full_name: string; logo_url: string | null; language: string };
  items: { kind: string; description: string; qty: number; unit: string }[];
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("get_share_by_token", { p_token: token });
  const d = data as ShareData | null;
  const t = getDict(d?.contractor?.language);

  if (!d) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">{t.proposal.notFound}</p>
      </main>
    );
  }

  const { share, estimate, contractor, items } = d;
  const company = contractor.company_name || contractor.full_name;
  const lang = contractor.language;

  const sp = {
    en: { q: "Interested in this job?", yes: "Yes", no: "No", ty: "Thanks — the contractor was notified!", tn: "No problem — thanks for the reply.", for: "Job offer for", from: "From", scope: "Work included" },
    pt: { q: "Interessado neste trabalho?", yes: "Sim", no: "Não", ty: "Valeu — o contratante foi avisado!", tn: "Sem problema — obrigado pela resposta.", for: "Proposta de trabalho para", from: "De", scope: "Trabalho incluído" },
    es: { q: "¿Te interesa este trabajo?", yes: "Sí", no: "No", ty: "¡Gracias — el contratista fue notificado!", tn: "Sin problema — gracias por responder.", for: "Oferta de trabajo para", from: "De", scope: "Trabajo incluido" },
  }[lang === "pt" ? "pt" : lang === "es" ? "es" : "en"];

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-white px-5 py-8 text-neutral-900">
      {/* who */}
      <div className="flex items-center gap-3">
        {contractor.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contractor.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover shadow" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-xl font-bold text-white">
            {company.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{sp.from}</p>
          <p className="text-lg font-bold">{company}</p>
        </div>
      </div>

      {share.sub_name && (
        <p className="mt-6 text-sm text-neutral-500">
          {sp.for} <span className="font-semibold text-neutral-900">{share.sub_name}</span>
        </p>
      )}

      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">{estimate.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">{estimate.trade}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
        {estimate.location && (
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {estimate.location}</span>
        )}
        {estimate.area_sqft != null && (
          <span className="flex items-center gap-1"><Ruler className="h-4 w-4" /> {estimate.area_sqft} sqft</span>
        )}
        {estimate.est_days != null && (
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {estimate.est_days} {t.estimate.days}</span>
        )}
      </div>

      {/* owner's offer message */}
      {share.custom_message && (
        <div className="mt-6 rounded-2xl bg-neutral-900 p-5 text-white">
          <p className="whitespace-pre-wrap text-lg leading-relaxed">{share.custom_message}</p>
        </div>
      )}

      {/* scope */}
      {items.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">{sp.scope}</p>
          <ul className="space-y-2">
            {items.slice(0, 40).map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-2">
                <span className="flex items-start gap-2 text-neutral-800">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {it.description}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm text-neutral-500">
                  {Number(it.qty)} {it.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* yes / no */}
      <section className="mt-8">
        <ShareRespond
          token={token}
          initialStatus={share.status}
          labels={{ question: sp.q, yes: sp.yes, no: sp.no, thanksYes: sp.ty, thanksNo: sp.tn }}
        />
      </section>

      <footer className="pt-10 text-center text-[11px] text-neutral-400">{company} · ContractorOS AI</footer>
    </main>
  );
}
