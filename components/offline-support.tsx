"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useLang } from "@/components/providers";
import { saveScopeAnswers } from "@/app/actions/scope-advisor";

type Lang = "en" | "pt" | "es";

const L = {
  offline: {
    en: "Offline — showing saved data. Changes will sync when you reconnect.",
    pt: "Sem internet — mostrando dados salvos. Mudanças sincronizam ao reconectar.",
    es: "Sin conexión — mostrando datos guardados. Los cambios se sincronizan al reconectar.",
  },
} as const;

const QUEUE_KEY = "cos_offline_queue_v1";

interface QueueEntry {
  kind: "scope_answers";
  estimateId: string;
  answers: Record<string, string>;
}

/** Stash a write for later when the device is offline. */
export function enqueueOffline(entry: QueueEntry) {
  try {
    const q: QueueEntry[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    q.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // storage full/blocked — nothing else we can do offline
  }
}

async function flushQueue() {
  let q: QueueEntry[] = [];
  try {
    q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return;
  }
  if (q.length === 0) return;
  const remaining: QueueEntry[] = [];
  for (const entry of q) {
    try {
      if (entry.kind === "scope_answers") {
        await saveScopeAnswers(entry.estimateId, entry.answers);
      }
    } catch {
      remaining.push(entry); // still failing — keep for the next reconnect
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

/**
 * App-wide offline layer: registers the service worker (offline page cache),
 * shows a banner while disconnected, and syncs queued writes on reconnect.
 */
export function OfflineSupport() {
  const lang = useLang() as Lang;
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only connectivity state
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      void flushQueue();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (navigator.onLine) void flushQueue();
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-1.5 bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      {L.offline[lang] ?? L.offline.en}
    </div>
  );
}
