"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Loader2 } from "lucide-react";

interface Labels {
  question: string;
  yes: string;
  no: string;
  thanksYes: string;
  thanksNo: string;
}

export function ShareRespond({
  token,
  initialStatus,
  labels,
}: {
  token: string;
  initialStatus: string;
  labels: Labels;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  function respond(response: "interested" | "declined") {
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("respond_to_share", {
        p_token: token,
        p_response: response,
      });
      if (data === true) setStatus(response);
    });
  }

  if (status === "interested") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-emerald-50 p-8 text-center">
        <Check className="h-12 w-12 text-emerald-600" />
        <p className="text-lg font-bold text-emerald-800">{labels.thanksYes}</p>
      </div>
    );
  }
  if (status === "declined") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-neutral-100 p-8 text-center">
        <X className="h-12 w-12 text-neutral-400" />
        <p className="text-lg font-semibold text-neutral-600">{labels.thanksNo}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-lg font-semibold">{labels.question}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={pending}
          onClick={() => respond("interested")}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
          {labels.yes}
        </button>
        <button
          disabled={pending}
          onClick={() => respond("declined")}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
        >
          <X className="h-6 w-6" />
          {labels.no}
        </button>
      </div>
    </div>
  );
}
