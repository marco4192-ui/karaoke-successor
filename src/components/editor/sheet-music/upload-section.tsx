'use client';

/**
 * Section 1 of the sheet music dialog: image/PDF upload + preview +
 * analyze button + the embedded PDF page navigation.
 *
 * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (dedented for the component level; the inline PDF-navigation block was
 * replaced by the SheetMusicPdfNavigation component — guard unchanged;
 * the leading "Section 1" comment stayed in the orchestrator).
 */
import { Button } from '@/components/ui/button';
import { Upload, ScanLine, FileText } from 'lucide-react';
import type { RefObject } from 'react';
import type { PdfPageImage } from '@/lib/editor/pdf-render';
import type { PickedImage } from './types';
import { SheetMusicPdfNavigation } from './pdf-page-navigation';

interface SheetMusicUploadSectionProps {
  t: (key: string) => string;
  /** Hidden persistent file input ref (browser path). */
  fileInputRef: RefObject<HTMLInputElement | null>;
  image: PickedImage | null;
  pdfFileName: string | null;
  pdfPages: PdfPageImage[] | null;
  pdfTotalPages: number;
  currentPageIndex: number;
  analyzeAll: boolean;
  setAnalyzeAll: (checked: boolean) => void;
  isAnalyzing: boolean;
  isRenderingPdf: boolean;
  canAnalyze: boolean;
  analyzingText: string;
  handlePickedFile: (file: File | null) => void;
  handleChooseFile: () => void;
  handleAnalyze: () => void;
  goToPage: (index: number) => void;
}

/** Image/PDF upload + preview + analyze (Section 1). */
export function SheetMusicUploadSection({
  t,
  fileInputRef,
  image,
  pdfFileName,
  pdfPages,
  pdfTotalPages,
  currentPageIndex,
  analyzeAll,
  setAnalyzeAll,
  isAnalyzing,
  isRenderingPdf,
  canAnalyze,
  analyzingText,
  handlePickedFile,
  handleChooseFile,
  handleAnalyze,
  goToPage,
}: SheetMusicUploadSectionProps) {
  return (
    <div className="space-y-3">
      {/* Hidden file input — the button triggers it (browser path;
          Tauri uses the native file picker instead) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,application/pdf,.pdf"
        className="hidden"
        aria-label={t('editor.midiImport.sheetMusic.chooseFile')}
        data-testid="sheet-music-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          // Allow re-picking the same file (change event must re-fire)
          e.target.value = '';
          void handlePickedFile(file);
        }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={handleChooseFile}
          disabled={isAnalyzing || isRenderingPdf}
          className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/10"
          data-testid="sheet-music-choose-image"
        >
          <Upload className="w-4 h-4" />
          {t('editor.midiImport.sheetMusic.chooseFile')}
        </Button>
        <Button
          variant="outline"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="border-cyan-500/60 text-cyan-300 hover:text-white hover:bg-cyan-500/20 disabled:opacity-40"
          data-testid="sheet-music-analyze"
        >
          {isAnalyzing || isRenderingPdf ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ScanLine className="w-4 h-4" />
          )}
          {isAnalyzing || isRenderingPdf
            ? analyzingText
            : pdfPages && pdfPages.length > 1 && analyzeAll
              ? t('editor.midiImport.sheetMusic.analyzeAll')
              : t('editor.midiImport.sheetMusic.analyze')}
        </Button>
        {image && (
          <span
            className="text-xs text-slate-500 truncate max-w-[220px]"
            data-testid="sheet-music-image-loaded"
            title={image.fileName}
          >
            {pdfFileName && pdfPages ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-red-400/80 shrink-0" aria-hidden />
                {pdfFileName}
              </span>
            ) : (
              image.fileName
            )}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-600" data-testid="sheet-music-upload-hint">
        {t('editor.midiImport.sheetMusic.uploadHint')}
      </p>

      {image?.dataUrl && (
        <div className="border border-slate-700 rounded-lg bg-slate-950/60 p-2 flex justify-center">
          <img
            src={image.dataUrl}
            alt={t('editor.midiImport.sheetMusic.title')}
            className="max-h-48 rounded object-contain"
            data-testid="sheet-music-preview"
          />
        </div>
      )}

      {/* ── PDF page navigation (thumbnails + prev/next + page indicator) ── */}
      {pdfPages && pdfPages.length > 0 && (
        <SheetMusicPdfNavigation
          pdfPages={pdfPages}
          pdfTotalPages={pdfTotalPages}
          currentPageIndex={currentPageIndex}
          isAnalyzing={isAnalyzing}
          isRenderingPdf={isRenderingPdf}
          analyzeAll={analyzeAll}
          setAnalyzeAll={setAnalyzeAll}
          goToPage={goToPage}
          t={t}
        />
      )}
    </div>
  );
}
