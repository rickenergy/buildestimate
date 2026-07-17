import { NextResponse } from "next/server";
import { createClient as createBareClient } from "@supabase/supabase-js";

// Keeps the Supabase project from pausing on the free tier (pauses after ~7
// days with no activity). A Vercel cron hits this daily; one tiny read is
// enough to count as activity. Uses the anon client + a public-safe count.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createBareClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // default_price_items is a seed table with a permissive read; a HEAD count
    // is the lightest possible touch.
    const { error } = await supabase
      .from("default_price_items")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
