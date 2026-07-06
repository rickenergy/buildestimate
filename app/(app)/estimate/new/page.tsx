"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDict, useLang } from "@/components/providers";
import { EstimatePreview, type EstimatePayload } from "@/components/estimate-preview";
import { Camera, Mic, MicOff, Send, Loader2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SPEECH_LANGS: Record<string, string> = { en: "en-US", pt: "pt-BR", es: "es-US" };

export default function NewEstimatePage() {
  const t = useDict();
  const lang = useLang();
  const { messages, sendMessage, status } = useChat();

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() && !files?.length) return;
    sendMessage({ text: input || "📷", files });
    setInput("");
    setFiles(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = SPEECH_LANGS[lang] ?? "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      setInput((prev) => {
        const base = prev.replace(/\s*\[…\]$/, "");
        return finalText ? base + finalText : base + (interim ? ` [${interim}]` : "");
      });
    };
    rec.onend = () => {
      setListening(false);
      setInput((prev) => prev.replace(/\s*\[.*\]$/, ""));
    };
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">{t.chat.title}</h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-44">
        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="h-7 w-7 text-primary" />
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">{t.chat.intro}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] space-y-2",
                message.role === "user"
                  ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground"
                  : "w-full"
              )}
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
                      {part.text}
                    </p>
                  );
                }
                if (part.type === "file" && part.mediaType?.startsWith("image/")) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={part.url}
                      alt={part.filename ?? "photo"}
                      className="max-h-48 rounded-lg"
                    />
                  );
                }
                if (part.type === "tool-lookup_prices") {
                  return (
                    <p key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2
                        className={cn(
                          "h-3 w-3",
                          part.state !== "output-available" && "animate-spin"
                        )}
                      />
                      {t.chat.checkingPrices}
                    </p>
                  );
                }
                if (part.type === "tool-calculate_estimate") {
                  if (part.state === "output-available") {
                    return (
                      <EstimatePreview key={i} payload={part.output as EstimatePayload} />
                    );
                  }
                  return (
                    <p key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t.chat.calculating}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {busy && messages[messages.length - 1]?.role === "user" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> {t.chat.thinking}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md border-t bg-background px-3 py-2"
      >
        {files && files.length > 0 && (
          <p className="mb-1 text-xs text-muted-foreground">
            📷 {Array.from(files).map((f) => f.name).join(", ")}
          </p>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && setFiles(e.target.files)}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0"
            aria-label={t.chat.addPhoto}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={listening ? "destructive" : "outline"}
            className="shrink-0"
            aria-label={t.chat.voice}
            onClick={toggleVoice}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? t.chat.listening : t.chat.placeholder}
            rows={1}
            className="max-h-28 min-h-10 flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={busy || (!input.trim() && !files?.length)}
            aria-label={t.chat.send}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </main>
  );
}
