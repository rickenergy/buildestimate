"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "photos";

/** Resize an image to ≤1600px JPEG blob before upload — keeps storage light. */
export async function resizeImageToBlob(file: File): Promise<Blob> {
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

/**
 * Upload a transaction attachment (product photo or nota fiscal) to the private
 * `photos` bucket under the caller's own folder. Images are resized; PDFs (and
 * anything non-image) upload as-is. Returns the storage path.
 */
export async function uploadAttachment(kind: "photo" | "invoice", file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const isImage = file.type.startsWith("image/");
  const body: Blob = isImage ? await resizeImageToBlob(file) : file;
  const ext = isImage ? "jpg" : file.name.split(".").pop()?.toLowerCase() || "bin";
  const contentType = isImage ? "image/jpeg" : file.type || "application/octet-stream";
  const path = `${user.id}/finance/${kind}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}
