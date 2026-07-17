"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDict, useLang } from "@/components/providers";
import { formatMoney } from "@/lib/format";
import { ArrowLeft, Printer } from "lucide-react";
import type { Estimate, EstimateItem, Profile } from "@/lib/types";

/** Profile fields the printable estimate needs (company identity + branding). */
export type PrintProfile = Pick<
  Profile,
  | "company_name"
  | "full_name"
  | "phone"
  | "logo_url"
  | "banner_url"
  | "company_address"
  | "company_email"
  | "license_number"
>;

interface Props {
  estimate: Estimate & {
    clients: { name: string; phone: string | null; address: string | null } | null;
  };
  items: EstimateItem[];
  profile: PrintProfile;
}

/** Print-ready output of every estimate figure — browser print → PDF. */
export function EstimatePrintView({ estimate, items, profile }: Props) {
  const t = useDict();
  const lang = useLang();

  const groups: { label: string; kinds: string[] }[] = [
    { label: t.estimate.material, kinds: ["material"] },
    { label: t.estimate.labor, kinds: ["labor", "other"] },
    { label: t.estimate.demoDisposal, kinds: ["demo", "disposal"] },
  ];

  const subtotal =
    Number(estimate.material_cost) + Number(estimate.labor_cost) + Number(estimate.demo_cost);
  const overhead = subtotal * (Number(estimate.overhead_pct) / 100);
  const profit = (subtotal + overhead) * (Number(estimate.profit_pct) / 100);
  const preTax = subtotal + overhead + profit;
  const tax = preTax * (Number(estimate.tax_pct) / 100);
  const total = Number(estimate.total);

  const meta = (estimate.project_meta ?? {}) as {
    location_label?: string;
    location_factor?: number;
  };

  const dateStr = new Date(estimate.created_at).toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <main className="mx-auto max-w-2xl bg-white px-6 py-6 text-black print:max-w-none print:px-0 print:py-0">
      {/* screen-only controls */}
      <div className="no-print mb-4 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/estimate/${estimate.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {t.common.back}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> {t.share.savePdf}
        </Button>
      </div>

      {/* banner (branding) */}
      {profile.banner_url && (
        <div className="mb-4 h-28 w-full overflow-hidden rounded-lg print:rounded-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* header */}
      <header className="mb-6 border-b pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {profile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.company_name || "—"}</h1>
              <p className="text-sm text-neutral-600">
                {profile.full_name}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
              {profile.company_email && (
                <p className="text-xs text-neutral-500">{profile.company_email}</p>
              )}
              {profile.company_address && (
                <p className="text-xs text-neutral-500">{profile.company_address}</p>
              )}
              {profile.license_number && (
                <p className="text-xs text-neutral-500">Lic. {profile.license_number}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-neutral-600">
            <p className="text-base font-semibold text-black">{t.estimate.title}</p>
            <p>{dateStr}</p>
          </div>
        </div>
      </header>

      {/* job info */}
      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-500">
            {t.proposal.preparedFor}
          </p>
          <p className="font-medium">{estimate.clients?.name ?? t.estimate.noClient}</p>
          {estimate.clients?.phone && <p>{estimate.clients.phone}</p>}
          {(estimate.location || estimate.clients?.address) && (
            <p>{estimate.location || estimate.clients?.address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-neutral-500">{estimate.title}</p>
          <p>
            {estimate.area_sqft ?? "—"} sqft · {estimate.crew_size ?? "—"} {t.estimate.people} ·{" "}
            {estimate.est_days ?? "—"} {t.estimate.days}
          </p>
          {meta.location_label && meta.location_factor && meta.location_factor !== 1 && (
            <p className="text-xs text-neutral-500">
              {meta.location_label} · {t.wizard.costIndex} ×{meta.location_factor.toFixed(2)}
            </p>
          )}
        </div>
      </section>

      {/* items */}
      {groups.map(({ label, kinds }) => {
        const rows = items.filter((i) => kinds.includes(i.kind));
        if (rows.length === 0) return null;
        return (
          <section key={label} className="mb-4">
            <h2 className="mb-1 border-b text-xs font-semibold uppercase text-neutral-500">
              {label}
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-100">
                    <td className="py-1 pr-2">{item.description}</td>
                    <td className="whitespace-nowrap py-1 pr-2 text-right text-neutral-500">
                      {Number(item.qty)} {item.unit}
                    </td>
                    <td className="w-24 whitespace-nowrap py-1 text-right font-medium">
                      {formatMoney(Number(item.total), lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {/* totals */}
      <section className="ml-auto mb-6 max-w-xs text-sm">
        <Row label={t.estimate.subtotal} value={formatMoney(subtotal, lang)} />
        <Row
          label={`${t.estimate.overhead} (${Number(estimate.overhead_pct)}%)`}
          value={formatMoney(overhead, lang)}
        />
        <Row
          label={`${t.estimate.profit} (${Number(estimate.profit_pct)}%)`}
          value={formatMoney(profit, lang)}
        />
        {tax > 0 && (
          <Row
            label={`${t.estimate.tax} (${Number(estimate.tax_pct)}%)`}
            value={formatMoney(tax, lang)}
          />
        )}
        <div className="mt-1 flex justify-between border-t pt-1 text-base font-bold">
          <span>{t.estimate.total}</span>
          <span>{formatMoney(total, lang)}</span>
        </div>
      </section>

      {/* payment plan */}
      <section className="mb-6 text-sm">
        <h2 className="mb-1 border-b text-xs font-semibold uppercase text-neutral-500">
          {t.analysis.paymentsTitle}
        </h2>
        <Row label={`${t.analysis.deposit} (40%)`} value={formatMoney(total * 0.4, lang)} />
        <Row label={`${t.analysis.progress} (40%)`} value={formatMoney(total * 0.4, lang)} />
        <Row label={`${t.analysis.final} (20%)`} value={formatMoney(total * 0.2, lang)} />
      </section>

      <footer className="border-t pt-3 text-xs text-neutral-500">
        <p>{t.share.printFooter}</p>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-neutral-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
