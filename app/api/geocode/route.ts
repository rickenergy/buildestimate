import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CensusMatch {
  matchedAddress: string;
  addressComponents?: {
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface AddressSuggestion {
  full: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Address autocomplete proxy over the US Census Geocoder.
 * Free, no key, US-only (matches the contractor market). Proxied
 * server-side because the Census endpoint has no CORS headers.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ suggestions: [] }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 4) return NextResponse.json({ suggestions: [] });

  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const data = (await res.json()) as { result?: { addressMatches?: CensusMatch[] } };

    const suggestions: AddressSuggestion[] = (data.result?.addressMatches ?? [])
      .slice(0, 5)
      .map((m) => ({
        full: m.matchedAddress,
        city: m.addressComponents?.city ?? "",
        state: m.addressComponents?.state ?? "",
        zip: m.addressComponents?.zip ?? "",
      }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
