"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushConfigured, type PushPayload, type StoredSubscription } from "@/lib/push";

export interface SaveSubInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function isPushConfigured() {
  return pushConfigured();
}

export async function savePushSubscription(sub: SaveSubInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
}

/** Send a test notification to all of the current user's devices. */
export async function sendTestPush(): Promise<{ ok: boolean; sent: number; needsConfig?: boolean }> {
  if (!pushConfigured()) return { ok: false, sent: 0, needsConfig: true };
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);
  const sent = await deliver(user.id, (data ?? []) as StoredSubscription[], {
    title: "ContractorOS AI",
    body: "🔔 Notifications are working.",
    url: "/home",
  });
  return { ok: true, sent };
}

/**
 * Server-side helper: notify a user on all their devices (use from events like
 * a proposal being answered). Uses the admin client so it works without a
 * session; prunes dead subscriptions.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  return deliver(userId, (data ?? []) as StoredSubscription[], payload);
}

async function deliver(userId: string, subs: StoredSubscription[], payload: PushPayload): Promise<number> {
  const admin = createAdminClient();
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      const res = await sendPush(s, payload);
      if (res === "ok") sent += 1;
      else if (res === "gone") dead.push(s.endpoint);
    })
  );
  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return sent;
}
