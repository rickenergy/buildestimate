/**
 * Subcontractor agreement template (US construction practice). English —
 * contracts in the US are signed in English; the surrounding UI is trilingual.
 * Plain-text clauses; NOT legal advice (disclaimer shown in UI and inside
 * the document).
 */

export interface ContractInput {
  contractorCompany: string;
  subName: string;
  subCompany: string | null;
  jobTitle: string;
  scope: string;
  amount: number;
  paymentTerms: string;
  retainagePct: number;
  startDate: string | null;
  endDate: string | null;
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function buildContractTerms(i: ContractInput): string {
  const subParty = i.subCompany ? `${i.subCompany} (represented by ${i.subName})` : i.subName;
  const dates =
    i.startDate && i.endDate
      ? `Work shall commence on or about ${i.startDate} and reach substantial completion by ${i.endDate}, subject to weather and site conditions.`
      : "Work dates shall be scheduled by mutual written agreement.";
  const retainage =
    i.retainagePct > 0
      ? `${i.retainagePct}% of each payment will be retained and released upon final acceptance of the Work.`
      : "No retainage applies to this Agreement.";

  return `SUBCONTRACTOR AGREEMENT

This Subcontractor Agreement ("Agreement") is made between ${i.contractorCompany} ("Contractor") and ${subParty} ("Subcontractor") for the project: ${i.jobTitle}.

1. SCOPE OF WORK. Subcontractor shall furnish all labor, supervision, tools and equipment necessary to complete the following work ("Work") in a good and workmanlike manner, in accordance with applicable codes and manufacturer instructions:
${i.scope}

2. CONTRACT PRICE. Contractor shall pay Subcontractor ${money(i.amount)} for full and satisfactory completion of the Work.

3. PAYMENT. ${i.paymentTerms || "Payment upon completion and acceptance of the Work, within 10 days of invoice."} ${retainage} Final payment is conditioned on delivery of a signed final lien waiver.

4. SCHEDULE. ${dates} Time is of the essence.

5. INDEPENDENT CONTRACTOR. Subcontractor is an independent contractor, not an employee, and is solely responsible for its own taxes (including providing a completed Form W-9), workers' compensation, and the supervision, wages and conduct of its workers.

6. INSURANCE. Subcontractor shall maintain commercial general liability insurance and workers' compensation insurance as required by law, and shall provide a certificate of insurance naming Contractor as additional insured before starting the Work.

7. LICENSES & COMPLIANCE. Subcontractor represents that it holds all licenses required for the Work and shall comply with all applicable laws, codes, permits and OSHA safety requirements.

8. CHANGES. No change to the Work or the Contract Price is valid unless agreed in a written change order signed by both parties.

9. WARRANTY. Subcontractor warrants the Work against defects in workmanship for one (1) year from substantial completion, and shall promptly correct defective Work at its own expense.

10. INDEMNIFICATION. Subcontractor shall defend, indemnify and hold harmless Contractor from claims, damages and expenses arising out of Subcontractor's performance of the Work, to the extent caused by Subcontractor's acts or omissions.

11. LIEN WAIVERS. Subcontractor shall provide conditional lien waivers with each payment application and an unconditional final lien waiver upon final payment.

12. TERMINATION. Contractor may terminate this Agreement for cause upon written notice if Subcontractor fails to perform; Subcontractor shall be paid for Work properly performed to the date of termination.

13. DISPUTES. The parties shall first attempt in good faith to resolve any dispute by direct negotiation. This Agreement is governed by the laws of the state where the project is located.

14. ENTIRE AGREEMENT. This Agreement is the entire agreement between the parties regarding the Work and supersedes all prior discussions.

By signing below, the parties agree to the terms of this Agreement.

NOTE: This is a general template provided for convenience and does not constitute legal advice. Review with a licensed attorney before relying on it.`;
}
