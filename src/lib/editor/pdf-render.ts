'use client';

/**
 * Client-side PDF → page image rendering for the sheet music (Notenblatt)
 * recognition. pdf.js renders each PDF page onto a canvas; the PNG data URLs
 * are sent to /api/sheet-music (VLM/OMR) page by page — the backend never
 * sees raw PDF bytes.
 *
 * The worker file (public/pdf.worker.min.mjs) is a build-time copy of
 * pdfjs-dist/build/pdf.worker.min.mjs — the version MUST match the
 * pdfjs-dist version in package.json.
 */

export interface PdfPageImage {
  /** 1-based page number in the document. */
  pageNumber: number;
  /** PNG data URL (preview + direct <img src>). */
  dataUrl: string;
  /** Raw base64 (without the data: prefix) for the API request. */
  base64: string;
  mimeType: 'image/png';
  width: number;
  height: number;
}

export interface RenderPdfOptions {
  /** Max pages to render (default 12) — protects the VLM rate limit. */
  maxPages?: number;
  /** Progress callback: (pagesDone, pagesTotal). */
  onProgress?: (_done: number, _total: number) => void;
}

/** Hard page cap — 20 VLM requests/min rate limit on the backend. */
export const MAX_PDF_PAGES = 12;

/**
 * Target render width in pixels. High enough for reliable OMR (staff lines,
 * accidentals, dots), low enough to keep base64 payloads < ~7 MB binary.
 */
const TARGET_RENDER_WIDTH = 1800;

const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;

let workerConfigured = false;

/** Lazily import pdf.js and configure the worker once. */
async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    workerConfigured = true;
  }
  return pdfjs;
}

export interface RenderPdfResult {
  /** Rendered pages (at most maxPages). */
  pages: PdfPageImage[];
  /** TRUE page count of the document (pages.length when under the cap). */
  totalPages: number;
}

/** Read a File (or ArrayBuffer) and render every page (up to maxPages) to PNG. */
export async function renderPdfToPageImages(
  source: File | ArrayBuffer,
  options: RenderPdfOptions = {},
): Promise<RenderPdfResult> {
  const maxPages = Math.max(1, Math.min(options.maxPages ?? MAX_PDF_PAGES, MAX_PDF_PAGES));
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();

  const pdfjs = await loadPdfJs();
  // v6: destroy() lives on the LoadingTask (getDocument result), not on
  // the document proxy — keep both references.
  const loadingTask = pdfjs.getDocument({
    data,
    // Avoid eval-based font rendering (CSP-safe in web + Tauri shells)
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  const pagesToRender = Math.min(pageCount, maxPages);
  const pages: PdfPageImage[] = [];

  for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, TARGET_RENDER_WIDTH / baseViewport.width),
    );
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas context unavailable');
    }
    // White backdrop — transparent PDF pages would render black in PNG
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      viewport,
      intent: 'display',
    }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    pages.push({
      pageNumber,
      dataUrl,
      base64: dataUrl.split(',')[1] ?? '',
      mimeType: 'image/png',
      width: canvas.width,
      height: canvas.height,
    });

    page.cleanup();
    options.onProgress?.(pageNumber, pagesToRender);
  }

  await loadingTask.destroy();
  return { pages, totalPages: pageCount };
}

/** True when the file name / mime type indicates a PDF document. */
export function isPdfFile(name: string, mimeType?: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'pdf' || mimeType === 'application/pdf';
}
