import Link from "next/link";

export const metadata = { title: "Privacy Policy · ContractorOS AI" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed">
      <Link href="/login" className="text-primary underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <Section title="Who we are">
        ContractorOS AI is estimating and job-management software for contractors. This policy
        explains what data we collect and how we use it.
      </Section>
      <Section title="Data we collect">
        Account data (name, email, company details you enter), the estimates, clients, suppliers,
        subcontractors, inventory and job data you create, and images you upload (logos, job photos,
        invoices). If you sign in with Google, we receive your name, email and profile photo.
      </Section>
      <Section title="How we use it">
        Only to provide the service: to build your estimates and proposals, keep your data available
        across devices, and let you share proposals or jobs via the links you generate. We do not
        sell your data or use it for advertising.
      </Section>
      <Section title="Cookies">
        We use only essential cookies to keep you signed in. No advertising or third-party tracking
        cookies are used.
      </Section>
      <Section title="Storage & security">
        Data is stored with Supabase (Postgres + object storage) with row-level security so each
        account can only access its own records. Access is protected by your password or Google sign-in.
      </Section>
      <Section title="Sharing">
        Proposals and job invites you send are reachable by anyone with the unique link you share.
        Otherwise your data is private to your account.
      </Section>
      <Section title="Your rights">
        You can edit or delete your data in the app at any time, or request full account deletion by
        contacting us.
      </Section>
      <Section title="Contact">
        Questions? Reach the account owner listed in your app settings.
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </section>
  );
}
