import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlueprintDetail } from "@/components/blueprint-detail";
import type { BlueprintRow } from "@/app/actions/blueprints";

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("blueprints")
    .select("id, name, file_path, is_image, status, analysis, answers, chosen_trade, created_at")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();
  if (!data) notFound();

  let imageUrl: string | null = null;
  if (data.is_image) {
    const { data: signed } = await supabase.storage.from("photos").createSignedUrl(data.file_path, 60 * 60);
    imageUrl = signed?.signedUrl ?? null;
  }

  return <BlueprintDetail blueprint={data as BlueprintRow} imageUrl={imageUrl} />;
}
