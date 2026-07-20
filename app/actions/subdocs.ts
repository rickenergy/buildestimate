"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubDocType = "w9" | "coi" | "license" | "agreement" | "lien_waiver" | "sov" | "other";

export interface SubDoc {
  id: string;
  subcontractor_id: string;
  doc_type: SubDocType;
  received: boolean;
  expires: string | null;
  reference: string | null;
  notes: string | null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

/** Mark a compliance doc as received (upsert) with optional expiry/reference. */
export async function upsertSubDoc(fields: {
  subcontractorId: string;
  docType: SubDocType;
  expires?: string | null;
  reference?: string | null;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("subcontractor_docs").upsert(
    {
      user_id: user.id,
      subcontractor_id: fields.subcontractorId,
      doc_type: fields.docType,
      received: true,
      expires: fields.expires || null,
      reference: fields.reference?.trim() || null,
    },
    { onConflict: "subcontractor_id,doc_type" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/subcontractors/${fields.subcontractorId}`);
}

export async function deleteSubDoc(subcontractorId: string, docType: SubDocType) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("subcontractor_docs")
    .delete()
    .eq("subcontractor_id", subcontractorId)
    .eq("doc_type", docType)
    .eq("user_id", user.id);
  revalidatePath(`/subcontractors/${subcontractorId}`);
}
