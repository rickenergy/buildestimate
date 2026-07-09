import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  Camera,
  Sparkles,
  FileCheck2,
  MessageCircle,
  Droplets,
  Paintbrush,
  Layers,
  Hammer,
  SprayCan,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const metadata = {
  title: "ContractorOS AI — AI Estimates for Local Contractors",
};

/** Public landing — premium dark, glass UI. App lives under /home. */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appHref = user ? "/home" : "/login";

  return (
    <div className="min-h-dvh bg-[#0b1512] text-white [color-scheme:dark]">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-96"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(59,178,130,0.18) 0%, transparent 70%)",
        }}
      />

      {/* nav */}
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-heading text-lg font-bold">
          <Image src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
          ContractorOS AI
        </span>
        <Link
          href={appHref}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium backdrop-blur transition-colors hover:bg-white/10"
        >
          {user ? "Open dashboard" : "Sign in"}
        </Link>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-3xl px-5 pb-16 pt-14 text-center">
        <p className="mx-auto mb-4 w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Built for local contractors
        </p>
        <h1 className="font-heading text-4xl font-bold leading-tight md:text-6xl">
          AI Estimates for Local Contractors
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
          Send a job photo, plan or voice note. Get a professional estimate, proposal and
          payment link in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={appHref}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-[#0b1512] transition-colors hover:bg-emerald-400"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/60 backdrop-blur">
            <MessageCircle className="h-4 w-4" /> Try on WhatsApp — coming soon
          </span>
        </div>
        <p className="mt-4 text-xs text-white/40">
          AI-generated draft. Final price must be reviewed and approved by the contractor.
        </p>
      </section>

      {/* how it works */}
      <section className="relative mx-auto max-w-5xl px-5 pb-16">
        <h2 className="mb-6 text-center font-heading text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Camera className="h-6 w-6" />,
              title: "1 · Capture the job",
              desc: "Photos, measurements, room-by-room mapping or a plain description.",
            },
            {
              icon: <Sparkles className="h-6 w-6" />,
              title: "2 · AI builds the draft",
              desc: "Scope, assumptions, line items, costs, regional pricing, margin and risk — you review and edit everything.",
            },
            {
              icon: <FileCheck2 className="h-6 w-6" />,
              title: "3 · Client approves",
              desc: "Professional proposal with a public approval link, PDF, WhatsApp send, deposits and invoices.",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                {s.icon}
              </span>
              <h3 className="font-heading text-base font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-white/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* mock flow strip */}
      <section className="relative mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur md:grid-cols-3">
          {[
            {
              icon: <TrendingUp className="h-4 w-4" />,
              k: "Profit protection",
              v: "Alerts when margin drops below your target — with the price to fix it.",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              k: "Book-grounded takeoffs",
              v: "Deterministic quantities from US estimating practice. AI never invents your numbers.",
            },
            {
              icon: <Wallet className="h-4 w-4" />,
              k: "Job finance built in",
              v: "Deposits, invoices, change orders, expenses and real profit per job.",
            },
          ].map((f) => (
            <div key={f.k} className="rounded-2xl bg-black/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                {f.icon}
                {f.k}
              </p>
              <p className="mt-1 text-xs text-white/60">{f.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* niches */}
      <section className="relative mx-auto max-w-5xl px-5 pb-16">
        <h2 className="mb-6 text-center font-heading text-2xl font-bold">Made for your trade</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <Droplets className="h-4 w-4" />, label: "Power washing" },
            { icon: <SprayCan className="h-4 w-4" />, label: "Cleaning companies" },
            { icon: <Paintbrush className="h-4 w-4" />, label: "Painting" },
            { icon: <Layers className="h-4 w-4" />, label: "Flooring" },
            { icon: <Hammer className="h-4 w-4" />, label: "Remodeling" },
          ].map((n) => (
            <span
              key={n.label}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur"
            >
              <span className="text-emerald-300">{n.icon}</span>
              {n.label}
            </span>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section className="relative mx-auto max-w-4xl px-5 pb-20">
        <h2 className="mb-6 text-center font-heading text-2xl font-bold">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="font-heading text-lg font-bold">Free trial</h3>
            <p className="mt-1 text-3xl font-bold">
              $0<span className="text-sm font-normal text-white/50"> / 14 days</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Unlimited estimates & proposals</li>
              <li>AI drafts + market intelligence</li>
              <li>PDF + WhatsApp sharing</li>
            </ul>
            <Link
              href={appHref}
              className="mt-6 block rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-center text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20"
            >
              Start Free Trial
            </Link>
          </div>
          <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/5 p-6 backdrop-blur">
            <h3 className="font-heading text-lg font-bold">Pro</h3>
            <p className="mt-1 text-3xl font-bold">
              $49<span className="text-sm font-normal text-white/50"> / month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Everything in trial</li>
              <li>Job tracking, alarms & CRM kanban</li>
              <li>Invoices, change orders & payment links</li>
              <li>Priority support</li>
            </ul>
            <Link
              href={appHref}
              className="mt-6 block rounded-full bg-emerald-500 px-5 py-2.5 text-center text-sm font-bold text-[#0b1512] transition-colors hover:bg-emerald-400"
            >
              Get Pro
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-5 py-6 text-center text-xs text-white/40">
        ContractorOS AI · AI-generated drafts are always reviewed and approved by the contractor.
      </footer>
    </div>
  );
}
