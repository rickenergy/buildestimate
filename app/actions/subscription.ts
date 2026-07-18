"use server";

import { createClient } from "@/lib/supabase/server";
import { publicBaseUrl } from "@/lib/site-url";

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  needsStripe?: boolean;
  error?: string;
}

const PRO_PRICE_CENTS = 4900; // $49/mo

/**
 * Start a Stripe Checkout session for the Pro subscription (REST, no SDK).
 * Uses STRIPE_PRICE_ID when set, otherwise creates a recurring price inline —
 * so the only required config is STRIPE_SECRET_KEY. Without the key the UI
 * shows setup instructions instead.
 */
export async function createSubscriptionCheckout(): Promise<CheckoutResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, needsStripe: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const stripe = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    if (!res.ok) throw new Error((await res.json())?.error?.message ?? `Stripe ${res.status}`);
    return res.json();
  };

  try {
    let priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      const price = await stripe("prices", {
        currency: "usd",
        unit_amount: String(PRO_PRICE_CENTS),
        "recurring[interval]": "month",
        "product_data[name]": "ContractorOS AI Pro",
      });
      priceId = price.id as string;
    }

    const base = publicBaseUrl();
    const session = await stripe("checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${base}/settings/billing?checkout=success`,
      cancel_url: `${base}/settings/billing?checkout=canceled`,
      client_reference_id: user.id,
      "metadata[user_id]": user.id,
      customer_email: user.email ?? "",
    });

    return { ok: true, url: session.url as string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Stripe error" };
  }
}
