import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlueprintDetail } from "@/components/blueprint-detail";
import { getBlueprintPageUrls, type BlueprintRow } from "@/app/actions/blueprints";

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
    .select("id, name, file_path, is_image, page_count, pages, status, analysis, answers, chosen_trade, trade_map, trade_scopes, created_at")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();
  if (!data) notFound();

  const pageUrls = await getBlueprintPageUrls(id);

  return <BlueprintDetail blueprint={data as BlueprintRow} pageUrls={pageUrls} />;
}
