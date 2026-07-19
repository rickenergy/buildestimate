"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/providers";
import { Mic, Loader2 } from "lucide-react";

type Lang = "en" | "pt" | "es";
const BCP47: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

const L = {
  speak: { en: "Dictate", pt: "Ditar", es: "Dictar" },
  listening: { en: "Listening…", pt: "Ouvindo…", es: "Escuchando…" },
} as const;

// Minimal Web Speech API typings (not in lib.dom by default).
interface SRAlternative {
  transcript: string;
}
interface SREvent {
  results: ArrayLike<ArrayLike<SRAlternative>>;
}
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: (e: SREvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SRCtor = new () => SRInstance;

function getSR(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Mic button — transcribes speech and hands the text to onTranscript. */
export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SRInstance | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only feature detection
    setSupported(getSR() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.lang = BCP47[lang];
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0]?.transcript ?? "";
      }
      if (text.trim()) onTranscript(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition " +
        (listening ? "border-rose-500 bg-rose-500/10 text-rose-600" : "hover:bg-muted")
      }
      aria-label={tr(L.speak)}
    >
      {listening ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tr(L.listening)}
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" /> {tr(L.speak)}
        </>
      )}
    </button>
  );
}
