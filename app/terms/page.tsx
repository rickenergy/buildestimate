import Link from "next/link";

export const metadata = { title: "Terms of Service · ContractorOS AI" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed">
      <Link href="/login" className="text-primary underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Terms of Service</h1>
      <p className="mt-1 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <Section title="Using the service">
        ContractorOS AI provides tools to create estimates, proposals and manage jobs. You are
        responsible for the accuracy of the data and prices you enter and for the estimates you send
        to your clients.
      </Section>
      <Section title="AI-generated content">
        AI features produce drafts to speed you up. Every AI estimate is a draft that you must review
        and approve. Final prices, scope and commitments to clients are your responsibility.
      </Section>
      <Section title="Your account">
        Keep your login secure. You are responsible for activity under your account. Do not misuse the
        service or attempt to access other accounts' data.
      </Section>
      <Section title="Your content">
        You own the data and images you upload. You grant us permission to store and process them only
        to operate the service for you.
      </Section>
      <Section title="Availability">
        The service is provided "as is". We work to keep it available and accurate but do not warrant
        it will be uninterrupted or error-free.
      </Section>
      <Section title="Changes">
        We may update these terms; continued use means you accept the updated terms.
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
