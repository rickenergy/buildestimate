"use client";

/**
 * Client-side PDF → page images. Large construction plans are multi-sheet PDFs;
 * we rasterize each page in the browser (no server dependency) so the AI can
 * read them and the GC can pick which sheet to take off.
 */

export interface RenderedPage {
  index: number; // 1-based
  blob: Blob; // JPEG
  width: number;
  height: number;
}

// Cap so a 200-sheet commercial set doesn't melt the phone. GC still sees all
// rendered pages up to the cap; the rest can be split into a second upload.
const MAX_PAGES = 40;

/** Render each PDF page to a JPEG blob at a detail-preserving size. */
export async function renderPdfToImages(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<RenderedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const total = Math.min(doc.numPages, MAX_PAGES);
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    // Aim ~2000px on the long edge — enough for the model to read text/symbols.
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 2000 / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    // white background (PDFs are transparent)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
    );
    pages.push({ index: i, blob, width: canvas.width, height: canvas.height });
    onProgress?.(i, total);
    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
}
