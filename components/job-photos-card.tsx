"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDict } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";
import {
  addJobPhoto,
  deleteJobPhoto,
  type PhotoPhase,
  type SignedJobPhoto,
} from "@/app/actions/photos";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";

interface Props {
  estimateId: string;
  before: SignedJobPhoto[];
  after: SignedJobPhoto[];
}

const BUCKET = "photos";
const MAX_PER_PHASE = 12;

/** Resize to ≤1600px JPEG blob before upload — keeps storage light. */
async function resizeToBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
        "image/jpeg",
        0.82
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function JobPhotosCard({ estimateId, before, after }: Props) {
  const t = useDict();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<PhotoPhase | null>(null);

  async function upload(phase: PhotoPhase, files: FileList | null) {
    const existing = phase === "before" ? before.length : after.length;
    if (!files || existing >= MAX_PER_PHASE) return;
    const list = [...files].slice(0, MAX_PER_PHASE - existing);
    setUploading(phase);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(null);
      toast.error(t.common.error);
      return;
    }
    try {
      for (const file of list) {
        const blob = await resizeToBlob(file);
        const path = `${user.id}/jobs/${estimateId}/${phase}-${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        await addJobPhoto(estimateId, phase, path);
      }
    } catch {
      toast.error(t.common.error);
    } finally {
      setUploading(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Camera className="h-4 w-4 text-primary" /> {t.photos.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Column
          phase="before"
          label={t.photos.before}
          photos={before}
          estimateId={estimateId}
          uploading={uploading}
          pending={pending}
          onFiles={upload}
          startTransition={startTransition}
          t={t}
        />
        <Column
          phase="after"
          label={t.photos.after}
          photos={after}
          estimateId={estimateId}
          uploading={uploading}
          pending={pending}
          onFiles={upload}
          startTransition={startTransition}
          t={t}
        />
      </CardContent>
    </Card>
  );
}

function Column({
  phase,
  label,
  photos,
  estimateId,
  uploading,
  pending,
  onFiles,
  startTransition,
  t,
}: {
  phase: PhotoPhase;
  label: string;
  photos: SignedJobPhoto[];
  estimateId: string;
  uploading: PhotoPhase | null;
  pending: boolean;
  onFiles: (phase: PhotoPhase, files: FileList | null) => void;
  startTransition: (cb: () => void) => void;
  t: ReturnType<typeof useDict>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading === phase;
  const full = photos.length >= MAX_PER_PHASE;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label} {photos.length > 0 && `· ${photos.length}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(phase, e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          disabled={busy || full}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {t.photos.add}
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
          {t.photos.empty}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-md bg-muted"
            >
              {p.url && (
                <Image
                  src={p.url}
                  alt={p.caption ?? label}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
              )}
              <button
                type="button"
                aria-label={t.common.delete}
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    deleteJobPhoto(p.id, estimateId);
                  })
                }
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
