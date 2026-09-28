'use client';

/**
 * PDF page navigation: thumbnails + prev/next + page indicator + the
 * analyze-all toggle (rendered inside the upload section when a PDF
 * with pages is loaded — the null/empty guard stays in the parent).
 *
 * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (only dedented for the component level).
 */
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PdfPageImage } from '@/lib/editor/pdf-render';

interface SheetMusicPdfNavigationProps {
  /** Rendered PDF pages (guaranteed non-empty — parent guards). */
  pdfPages: PdfPageImage[];
  pdfTotalPages: number;
  currentPageIndex: number;
  isAnalyzing: boolean;
  isRenderingPdf: boolean;
  analyzeAll: boolean;
  setAnalyzeAll: (checked: boolean) => void;
  goToPage: (index: number) => void;
  t: (key: string) => string;
}

/** Thumbnails + prev/next + page indicator + analyze-all toggle. */
export function SheetMusicPdfNavigation({
  pdfPages,
  pdfTotalPages,
  currentPageIndex,
  isAnalyzing,
  isRenderingPdf,
  analyzeAll,
  setAnalyzeAll,
  goToPage,
  t,
}: SheetMusicPdfNavigationProps) {
  return (
    <div
      className="space-y-2 border border-slate-700/70 rounded-lg bg-slate-900/60 p-2.5"
      data-testid="sheet-music-pdf-pages"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-red-400/80 shrink-0" aria-hidden />
          <span className="text-xs text-slate-400 font-mono truncate" data-testid="sheet-music-pdf-page-indicator">
            {t('editor.midiImport.sheetMusic.pdfPage')
              .replace('{page}', String(currentPageIndex + 1))
              .replace('{total}', String(pdfPages.length))}
          </span>
          {pdfTotalPages > pdfPages.length && (
            <span className="text-[10px] text-amber-500/80" title={t('editor.midiImport.sheetMusic.pdfPageCapHint')}>
              {t('editor.midiImport.sheetMusic.pdfPageCap').replace('{max}', String(pdfPages.length))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0 || isAnalyzing || isRenderingPdf}
            aria-label={t('editor.midiImport.sheetMusic.pdfPrevPage')}
            className="text-slate-400 hover:text-white h-7 w-7 p-0"
            data-testid="sheet-music-pdf-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPageIndex + 1)}
            disabled={currentPageIndex >= pdfPages.length - 1 || isAnalyzing || isRenderingPdf}
            aria-label={t('editor.midiImport.sheetMusic.pdfNextPage')}
            className="text-slate-400 hover:text-white h-7 w-7 p-0"
            data-testid="sheet-music-pdf-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Thumbnail strip (max-h with scroll for many pages) */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 editor-panel-scroll"
        role="tablist"
        aria-label={t('editor.midiImport.sheetMusic.pdfPages')}
      >
        {pdfPages.map((page, index) => (
          <button
            key={page.pageNumber}
            type="button"
            role="tab"
            aria-selected={index === currentPageIndex}
            onClick={() => goToPage(index)}
            disabled={isAnalyzing || isRenderingPdf}
            data-testid={`sheet-music-pdf-thumb-${index + 1}`}
            title={t('editor.midiImport.sheetMusic.pdfPage')
              .replace('{page}', String(index + 1))
              .replace('{total}', String(pdfPages.length))}
            className={cn(
              'relative shrink-0 rounded border overflow-hidden transition-all',
              index === currentPageIndex
                ? 'border-cyan-400 ring-1 ring-cyan-400/60'
                : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100',
            )}
          >
            <img
              src={page.dataUrl}
              alt=""
              className="h-16 w-auto object-contain bg-white pointer-events-none"
              loading="lazy"
            />
            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-mono px-1 rounded-tl">
              {page.pageNumber}
            </span>
          </button>
        ))}
      </div>

      {/* Analyze-all toggle (multi-page PDFs only) */}
      {pdfPages.length > 1 && (
        <label
          className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300"
          data-testid="sheet-music-analyze-all-toggle"
        >
          <input
            type="checkbox"
            checked={analyzeAll}
            onChange={(e) => setAnalyzeAll(e.target.checked)}
            disabled={isAnalyzing || isRenderingPdf}
            className="accent-cyan-500 w-3.5 h-3.5"
          />
          <Layers className="w-3.5 h-3.5 text-purple-400" aria-hidden />
          {t('editor.midiImport.sheetMusic.analyzeAll')}
        </label>
      )}
    </div>
  );
}
