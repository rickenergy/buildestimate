import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only (never import in client code
 * or expose the key). Used by trusted server routes like the Stripe webhook,
 * where there is no user session but we must update a specific profile.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
