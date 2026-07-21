"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers";
import { uploadBlueprintImageBlob, uploadBlueprintImageFile } from "@/lib/upload-client";
import { renderPdfToImages } from "@/lib/pdf-render";
import { createBlueprint, deleteBlueprint, type BlueprintPage, type BlueprintRow } from "@/app/actions/blueprints";
import { Map, Upload, Loader2, ChevronRight, Trash2, FileStack, ImageIcon } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  title: { en: "Blueprints & takeoff", pt: "Plantas & takeoff", es: "Planos & takeoff" },
  subtitle: {
    en: "Upload a plan (PDF or image) — AI reads each sheet, classifies it, and asks what it can't be sure of.",
    pt: "Suba uma planta (PDF ou imagem) — a IA lê cada folha, classifica e pergunta o que não tem certeza.",
    es: "Sube un plano (PDF o imagen) — la IA lee cada hoja, la clasifica y pregunta lo que no puede asegurar.",
  },
  upload: { en: "Upload plan (PDF or image)", pt: "Subir planta (PDF ou imagem)", es: "Subir plano (PDF o imagen)" },
  empty: { en: "No plans yet. Upload one to start.", pt: "Nenhuma planta ainda. Suba uma para começar.", es: "Sin planos aún. Sube uno para empezar." },
  rendering: { en: "Reading pages", pt: "Lendo páginas", es: "Leyendo páginas" },
  uploading: { en: "Uploading pages", pt: "Enviando páginas", es: "Subiendo páginas" },
  fail: { en: "Upload failed.", pt: "Falha no upload.", es: "Falló la subida." },
  sheets: { en: "sheets", pt: "folhas", es: "hojas" },
  status: {
    uploaded: { en: "Not read", pt: "Não lida", es: "Sin leer" },
    analyzed: { en: "Read", pt: "Lida", es: "Leída" },
    takeoff: { en: "Takeoff started", pt: "Takeoff iniciado", es: "Takeoff iniciado" },
    done: { en: "Done", pt: "Concluída", es: "Hecha" },
  },
  capNote: {
    en: "Big sets: first 40 sheets are loaded. Split the rest into a second upload.",
    pt: "Plantas grandes: as 40 primeiras folhas são carregadas. Divida o resto num 2º upload.",
    es: "Planos grandes: se cargan las primeras 40 hojas. Divide el resto en otra subida.",
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
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      let pages: BlueprintPage[] = [];
      let isImage = true;

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        isImage = false;
        setBusy(`${tr(L.rendering)}…`);
        const rendered = await renderPdfToImages(file, (d, t) => setBusy(`${tr(L.rendering)} ${d}/${t}`));
        for (let k = 0; k < rendered.length; k++) {
          setBusy(`${tr(L.uploading)} ${k + 1}/${rendered.length}`);
          const path = await uploadBlueprintImageBlob(rendered[k].blob);
          pages.push({ i: rendered[k].index, path });
        }
      } else {
        setBusy(`${tr(L.uploading)}…`);
        const path = await uploadBlueprintImageFile(file);
        pages = [{ i: 1, path }];
      }

      const res = await createBlueprint({ name: file.name.replace(/\.[^.]+$/, ""), pages, isImage });
      if (res.ok && res.id) router.push(`/blueprints/${res.id}`);
      else toast.error(res.error ?? tr(L.fail));
    } catch {
      toast.error(tr(L.fail));
    } finally {
      setBusy(null);
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
      <Button className="press h-12 rounded-2xl" disabled={!!busy} onClick={() => fileRef.current?.click()}>
        {busy ? <Loader2 className="mr-1 h-5 w-5 animate-spin" /> : <Upload className="mr-1 h-5 w-5" />}
        {busy ?? tr(L.upload)}
      </Button>
      <p className="-mt-2 px-1 text-xs text-muted-foreground">{tr(L.capNote)}</p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{tr(L.empty)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((b) => (
            <Card key={b.id} className="animate-fade-up">
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {b.is_image ? <ImageIcon className="h-5 w-5" /> : <FileStack className="h-5 w-5" />}
                </span>
                <Link href={`/blueprints/${b.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.page_count} {tr(L.sheets)} · {b.created_at.slice(0, 10)}
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
