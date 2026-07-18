import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook — flips profiles.plan on subscription events.
 * Verifies the stripe-signature header (HMAC-SHA256) manually, no SDK.
 * Config needed: STRIPE_WEBHOOK_SECRET + the endpoint registered in Stripe
 * (…/api/stripe/webhook) listening to checkout.session.completed and
 * customer.subscription.deleted.
 */
function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "unconfigured" }, { status: 400 });

  const body = await req.text();
  if (!verifySignature(body, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as {
        metadata?: { user_id?: string };
        client_reference_id?: string;
        customer?: string;
      };
      const userId = s.metadata?.user_id ?? s.client_reference_id;
      if (userId) {
        await admin
          .from("profiles")
          .update({ plan: "pro", stripe_customer_id: s.customer ?? null })
          .eq("id", userId);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as { customer?: string };
      if (sub.customer) {
        await admin.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", sub.customer);
      }
    }
  } catch {
    // never 500 back to Stripe on our own DB hiccup — it would retry forever
    return NextResponse.json({ received: true, handled: false });
  }

  return NextResponse.json({ received: true });
}
