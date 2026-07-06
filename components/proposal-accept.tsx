"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, PenLine } from "lucide-react";

interface Labels {
  title: string;
  name: string;
  button: string;
  pdf: string;
}

export function ProposalAccept({ token, labels }: { token: string; labels: Labels }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function accept() {
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("accept_proposal", {
        p_token: token,
        p_signed_name: name.trim(),
      });
      if (error || data !== true) {
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder={labels.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">✕</p>}
          <Button
            size="lg"
            className="h-12"
            disabled={pending || name.trim().length < 3}
            onClick={accept}
          >
            <PenLine className="mr-1 h-5 w-5" /> {labels.button}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="mr-1 h-4 w-4" /> {labels.pdf}
      </Button>
    </div>
  );
}
