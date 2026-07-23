"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Input that keeps its value in LOCAL state while typing and lifts to the
 * parent only on blur. Prevents every keystroke from re-rendering a large
 * parent tree (the blueprint-detail INP fix). `value` still flows down, so
 * programmatic updates (e.g. voice dictation) sync in via the effect.
 */
export function CommittedInput({
  value,
  onCommit,
  ...rest
}: {
  value: string | number;
  onCommit: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur">) {
  const [local, setLocal] = useState(String(value));

  // Sync when the parent value changes from outside (voice, refresh).
  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <Input
      {...rest}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== String(value)) onCommit(local);
      }}
    />
  );
}
