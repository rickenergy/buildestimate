"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { uploadBlueprint } from "@/lib/upload-client";
import { createBlueprint, deleteBlueprint, type BlueprintRow } from "@/app/actions/blueprints";
import { Map, Upload, Loader2, ChevronRight, Trash2, FileText, ImageIcon } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Blueprints & takeoff", pt: "Plantas & takeoff", es: "Planos & takeoff" },
  subtitle: {
    en: "Upload a plan — AI reads it, asks what it can't be sure of, and preps the takeoff.",
    pt: "Suba uma planta — a IA lê, pergunta o que não tem certeza e prepara o takeoff.",
    es: "Sube un plano — la IA lo lee, pregunta lo que no puede asegurar y prepara el takeoff.",
  },
  upload: { en: "Upload plan", pt: "Subir planta", es: "Subir plano" },
  empty: { en: "No plans yet. Upload one to start.", pt: "Nenhuma planta ainda. Suba uma para começar.", es: "Sin planos aún. Sube uno para empezar." },
  uploading: { en: "Uploading…", pt: "Enviando…", es: "Subiendo…" },
  fail: { en: "Upload failed.", pt: "Falha no upload.", es: "Falló la subida." },
  hint: {
    en: "Tip: a clear photo or image of the sheet works best. PDF reading comes next.",
    pt: "Dica: uma foto/imagem nítida da folha funciona melhor. Leitura de PDF vem a seguir.",
    es: "Consejo: una foto/imagen nítida de la hoja funciona mejor. La lectura de PDF viene después.",
  },
  status: {
    uploaded: { en: "Not analyzed", pt: "Não analisada", es: "Sin analizar" },
    analyzed: { en: "Analyzed", pt: "Analisada", es: "Analizada" },
    takeoff: { en: "Takeoff started", pt: "Takeoff iniciado", es: "Takeoff iniciado" },
    done: { en: "Done", pt: "Concluída", es: "Hecha" },
  },
} as const;

const STATUS_CLS: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground",
  analyzed: "bg-primary/15 text-primary",
  takeoff: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export function BlueprintsList({ rows }: { rows: BlueprintRow[] }) {
  const lang = useLang() as Lang;
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { path, isImage } = await uploadBlueprint(file);
      const res = await createBlueprint({ name: file.name.replace(/\.[^.]+$/, ""), filePath: path, isImage });
      if (res.ok && res.id) router.push(`/blueprints/${res.id}`);
      else toast.error(res.error ?? tr(L.fail));
    } catch {
      toast.error(tr(L.fail));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Map className="h-5 w-5 text-primary" /> {tr(L.title)}
        </h1>
        <p className="text-sm text-muted-foreground">{tr(L.subtitle)}</p>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button className="press h-12 rounded-2xl" disabled={uploading} onClick={() => fileRef.current?.click()}>
        {uploading ? <Loader2 className="mr-1 h-5 w-5 animate-spin" /> : <Upload className="mr-1 h-5 w-5" />}
        {uploading ? tr(L.uploading) : tr(L.upload)}
      </Button>
      <p className="-mt-2 px-1 text-xs text-muted-foreground">{tr(L.hint)}</p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((b) => (
            <Card key={b.id} className="animate-fade-up">
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {b.is_image ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </span>
                <Link href={`/blueprints/${b.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.created_at.slice(0, 10)}
                    {b.chosen_trade ? ` · ${b.chosen_trade}` : ""}
                  </p>
                </Link>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[b.status] ?? ""}`}>
                  {tr(L.status[(b.status as keyof typeof L.status) in L.status ? (b.status as keyof typeof L.status) : "uploaded"])}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="delete"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await deleteBlueprint(b.id); router.refresh(); })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
