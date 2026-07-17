"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cos-cookie-consent";

/**
 * Minimal, privacy-first cookie banner. The app only sets essential cookies
 * (the auth session) — no trackers — so the choice is "Accept" vs "Essential
 * only". We remember the choice in localStorage and never show it again.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  function decide(value: "all" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:max-w-lg">
        <p className="text-sm text-muted-foreground">
          We use only essential cookies to keep you signed in — no ads or trackers. See our{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary underline">
            Terms
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => decide("essential")}
            className="press flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted"
          >
            Essential only
          </button>
          <button
            onClick={() => decide("all")}
            className="press flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground shadow-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
