/**
 * Public base URL for links we SHARE with other people (proposals, PDFs).
 *
 * Never emit localhost: a link generated while the owner is on the dev server
 * must still open on a client's phone. Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL (set this in Vercel + .env.local)
 *   2. the current origin, but only if it isn't localhost
 *   3. the known production domain
 */
const PRODUCTION = "https://buildestimate-ai.vercel.app";

export function publicBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const o = window.location.origin;
    if (!o.includes("localhost") && !o.includes("127.0.0.1")) return o;
  }
  return PRODUCTION;
}
