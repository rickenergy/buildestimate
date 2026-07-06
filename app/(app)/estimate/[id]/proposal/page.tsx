import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProposal } from "@/app/actions/proposals";
import { ProposalEditor } from "@/components/proposal-editor";
import type { Estimate, Proposal } from "@/lib/types";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, title, trade, total, status")
    .eq("id", id)
    .single();
  if (!estimate) notFound();

  const proposal = await getOrCreateProposal(id);

  return (
    <ProposalEditor
      estimate={estimate as Pick<Estimate, "id" | "title" | "trade" | "total" | "status">}
      proposal={proposal as Proposal}
    />
  );
}
