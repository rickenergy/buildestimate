"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "photos";

/** Resize an image to ≤`max`px JPEG blob before upload — keeps storage light. */
export async function resizeImageToBlob(file: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
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

/**
 * Upload a subcontractor compliance document (W-9, COI, license, contract…) to
 * the private `photos` bucket under the owner's folder. Images are resized;
 * PDFs upload as-is. Returns the storage path (view later via a signed URL).
 */
export async function uploadSubDoc(subId: string, docType: string, file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const isImage = file.type.startsWith("image/");
  const body: Blob = isImage ? await resizeImageToBlob(file) : file;
  const ext = isImage ? "jpg" : file.name.split(".").pop()?.toLowerCase() || "pdf";
  const contentType = isImage ? "image/jpeg" : file.type || "application/pdf";
  const path = `${user.id}/subdocs/${subId}/${docType}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

/**
 * Upload company branding (logo or wide banner) to the PUBLIC `logos` bucket and
 * return a permanent public URL. Public on purpose: the proposal page is opened
 * by clients who are not signed in, so a signed (expiring) URL would break.
 * Logo stays square-ish (512px); banner keeps width for a hero strip (1600px).
 */
export async function uploadBranding(kind: "logo" | "banner", file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const blob = await resizeImageToBlob(file, kind === "logo" ? 512 : 1600);
  // Overwrite the same key so old files don't pile up; cache-bust via ?v=.
  const path = `${user.id}/${kind}.jpg`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
