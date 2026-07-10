"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PhotoPhase = "before" | "after";

export interface JobPhoto {
  id: string;
  user_id: string;
  estimate_id: string;
  phase: PhotoPhase;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

/** A photo row plus a short-lived signed URL for display (private bucket). */
export interface SignedJobPhoto extends JobPhoto {
  url: string | null;
}

const BUCKET = "photos";
const SIGN_TTL = 60 * 60; // 1h

function refresh(estimateId: string) {
  revalidatePath(`/estimate/${estimateId}`);
}

/** Record a photo already uploaded to storage by the browser client. */
export async function addJobPhoto(
  estimateId: string,
  phase: PhotoPhase,
  storagePath: string,
  caption?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  // Guard: the path must live under the caller's own folder.
  if (!storagePath.startsWith(`${user.id}/`)) throw new Error("Invalid path");

  const { error } = await supabase.from("job_photos").insert({
    user_id: user.id,
    estimate_id: estimateId,
    phase,
    storage_path: storagePath,
    caption: caption?.trim() || null,
  });
  if (error) throw new Error(error.message);
  refresh(estimateId);
}

export async function deleteJobPhoto(photoId: string, estimateId: string) {
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("job_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  await supabase.from("job_photos").delete().eq("id", photoId);
  if (photo?.storage_path) {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  }
  refresh(estimateId);
}

export async function updatePhotoCaption(
  photoId: string,
  estimateId: string,
  caption: string
) {
  const supabase = await createClient();
  await supabase
    .from("job_photos")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId);
  refresh(estimateId);
}

/** Sign a list of photo rows for display. Returns them ordered as given. */
export async function signPhotos(photos: JobPhoto[]): Promise<SignedJobPhoto[]> {
  if (photos.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      photos.map((p) => p.storage_path),
      SIGN_TTL
    );
  const byPath = new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  return photos.map((p) => ({ ...p, url: byPath.get(p.storage_path) ?? null }));
}
