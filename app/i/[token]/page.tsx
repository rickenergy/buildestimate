import { createClient } from "@/lib/supabase/server";
import { InviteAccept } from "@/components/invite-accept";

export default async function ShortInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <InviteAccept token={token} isLoggedIn={!!user} />;
}
