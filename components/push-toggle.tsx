"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { savePushSubscription, deletePushSubscription, sendTestPush } from "@/app/actions/push";
import { Bell, BellOff, Loader2, Send } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Push notifications", pt: "Notificações push", es: "Notificaciones push" },
  desc: {
    en: "Get alerts when a proposal is answered or a job needs attention.",
    pt: "Receba alertas quando uma proposta é respondida ou uma obra precisa de atenção.",
    es: "Recibe alertas cuando responden una propuesta o una obra necesita atención.",
  },
  enable: { en: "Enable", pt: "Ativar", es: "Activar" },
  disable: { en: "Disable", pt: "Desativar", es: "Desactivar" },
  test: { en: "Send test", pt: "Enviar teste", es: "Enviar prueba" },
  unsupported: {
    en: "This device/browser doesn't support push notifications.",
    pt: "Este dispositivo/navegador não suporta notificações push.",
    es: "Este dispositivo/navegador no soporta notificaciones push.",
  },
  needsConfig: {
    en: "Not configured yet (VAPID keys). Add them in Vercel to enable.",
    pt: "Ainda não configurado (chaves VAPID). Adicione na Vercel para ativar.",
    es: "Aún no configurado (claves VAPID). Agrégalas en Vercel para activar.",
  },
  denied: {
    en: "Notifications are blocked in your browser settings.",
    pt: "Notificações estão bloqueadas nas configurações do navegador.",
    es: "Las notificaciones están bloqueadas en el navegador.",
  },
  enabled: { en: "Notifications enabled.", pt: "Notificações ativadas.", es: "Notificaciones activadas." },
  sent: { en: "Test sent.", pt: "Teste enviado.", es: "Prueba enviada." },
} as const;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, startTransition] = useTransition();

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only feature detection
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!vapid) {
      toast.error(tr(L.needsConfig));
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error(tr(L.denied));
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    startTransition(async () => {
      await savePushSubscription({
        endpoint: json.endpoint ?? sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
      toast.success(tr(L.enabled));
    });
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      startTransition(async () => {
        await deletePushSubscription(endpoint);
        setSubscribed(false);
      });
    } else {
      setSubscribed(false);
    }
  }

  function test() {
    startTransition(async () => {
      const res = await sendTestPush();
      if (res.needsConfig) toast.error(tr(L.needsConfig));
      else toast.success(tr(L.sent));
    });
  }

  if (supported === false) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="p-4 text-sm text-muted-foreground">{tr(L.unsupported)}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{tr(L.title)}</p>
          <p className="text-xs text-muted-foreground">{tr(L.desc)}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {subscribed && (
            <Button size="icon" variant="outline" className="h-9 w-9" disabled={pending} onClick={test} aria-label={tr(L.test)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
          <Button
            size="sm"
            variant={subscribed ? "outline" : "default"}
            disabled={pending || supported === null}
            onClick={subscribed ? disable : enable}
          >
            {subscribed ? tr(L.disable) : tr(L.enable)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
