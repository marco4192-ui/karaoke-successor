'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ICON GALLERY DIALOG (R93) — Icon-Bibliothek für eigene Handmade-Icons
//
// Zeigt den kompletten Icon-Katalog (icon-catalog.tsx) als durchsuchbare
// Galerie: jedes Icon mit Vorschau, Name, Funktion und Einsatzorten.
// Klick auf eine Karte kopiert die SVG-Vorlage (currentColor) in die
// Zwischenablage — als Ausgangspunkt für eigene, handgezeichnete Icons.
// Der Download-Button speichert die Vorlage als .svg-Datei.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  ICON_CATALOG, ICON_CATEGORIES, iconCountsByCategory,
  type IconCatalogEntry, type IconCategoryId,
} from '@/components/settings/icon-catalog';
import { Search, Copy, Download, X, Info } from 'lucide-react';

interface IconGalleryDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
}

const SET_LABELS: Record<IconCatalogEntry['set'], { label: string; className: string }> = {
  lucide: { label: 'Lucide', className: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30' },
  custom: { label: 'Eigenes SVG', className: 'bg-pink-500/10 text-pink-300 border-pink-400/30' },
  inline: { label: 'Inline-SVG', className: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
};

/** Serialisiert das gerenderte SVG-Element zu einer sauberen Standalone-Vorlage. */
function serializeIconSvg(container: HTMLElement | null): string | null {
  const svg = container?.querySelector('svg');
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '24');
  clone.setAttribute('height', '24');
  return new XMLSerializer().serializeToString(clone);
}

export function IconGalleryDialog({ open, onOpenChange }: IconGalleryDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IconCategoryId | 'all'>('all');
  /** Alle Karten-Container für die SVG-Serialisierung (id → Element). */
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const counts = useMemo(() => iconCountsByCategory(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ICON_CATALOG.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (!q) return true;
      const haystack = [
        entry.name, entry.desc, entry.set, ...entry.areas, ...(entry.aliases ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  const copySvg = (entry: IconCatalogEntry) => {
    const markup = serializeIconSvg(cardRefs.current.get(entry.id) ?? null);
    if (!markup) return;
    navigator.clipboard
      .writeText(markup)
      .then(() => {
        toast({
          title: 'SVG kopiert',
          description: `${entry.name} — Vorlage liegt in der Zwischenablage (Farbe: currentColor).`,
        });
      })
      .catch(() => {
        toast({ title: 'Kopieren fehlgeschlagen', description: 'Bitte den Download-Button nutzen.' });
      });
  };

  const downloadSvg = (entry: IconCatalogEntry) => {
    const markup = serializeIconSvg(cardRefs.current.get(entry.id) ?? null);
    if (!markup) return;
    const blob = new Blob([markup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afterten-icon-${entry.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[88vh] flex flex-col gap-0 p-0 bg-[#0a0a1a]/95 border-cyan-400/20 overflow-hidden"
        data-testid="icon-gallery-dialog"
      >
        {/* ── Kopf ── */}
        <DialogHeader className="p-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <span className="text-[#7dd8f5]">Icon-Bibliothek</span>
                <span className="text-xs font-medium text-white/40 mt-1">
                  {ICON_CATALOG.length} Icons im Spiel
                </span>
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60 mt-1">
                Referenz aller Icons mit Funktion und Einsatzort — als Vorlage für eigene,
                handgemachte Icons. Klick auf eine Karte kopiert die SVG-Vorlage.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Schließen"
              className="shrink-0 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 hover:border-white/30 text-white/70 hover:text-white transition-all w-9 h-9 flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {/* Suche + Hinweis */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Icon, Funktion oder Ort suchen …"
                className="pl-9 h-10 bg-white/5 border-white/15 text-white placeholder:text-white/35 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/50"
                data-testid="icon-gallery-search"
                aria-label="Icons durchsuchen"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Suche löschen"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/50 sm:pr-1">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-cyan-400/70" aria-hidden /> Lucide
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-pink-400/70" aria-hidden /> Eigenes SVG
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-amber-400/70" aria-hidden /> Inline-SVG
              </span>
            </div>
          </div>

          {/* Kategorie-Filter */}
          <div
            className="flex gap-1.5 overflow-x-auto pt-3 pb-0.5 -mx-1 px-1"
            role="tablist"
            aria-label="Icon-Kategorien"
          >
            {ICON_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              const count = counts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                      : 'bg-white/5 border-white/10 text-white/55 hover:text-white/85 hover:border-white/25'
                  }`}
                  data-testid={`icon-category-${cat.id}`}
                >
                  {cat.label}
                  <span className={`ml-1.5 ${active ? 'text-cyan-300/80' : 'text-white/30'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* ── Grid ── */}
        <div className="flex-1 overflow-y-auto p-4" data-testid="icon-gallery-grid">
          {filtered.length === 0 ? (
            <div className="h-full min-h-40 flex flex-col items-center justify-center text-white/50 gap-2">
              <Search className="w-8 h-8 opacity-40" aria-hidden />
              <p className="text-sm">Keine Icons gefunden — anderen Suchbegriff probieren.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((entry) => {
                const setInfo = SET_LABELS[entry.set];
                const IconComp = entry.component;
                return (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => copySvg(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        copySvg(entry);
                      }
                    }}
                    ref={(el) => {
                      if (el) cardRefs.current.set(entry.id, el);
                      else cardRefs.current.delete(entry.id);
                    }}
                    className="group relative flex flex-col rounded-xl border border-white/10 bg-white/[0.03] hover:border-cyan-400/40 hover:bg-cyan-400/[0.06] transition-all cursor-pointer p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                    title={`Klicken: SVG-Vorlage von ${entry.name} kopieren`}
                    data-testid={`icon-card-${entry.id}`}
                  >
                    {/* Download-Button (erscheint bei Hover) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSvg(entry);
                      }}
                      aria-label={`${entry.name} als SVG herunterladen`}
                      title="SVG-Vorlage herunterladen"
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg border border-white/10 bg-[#0a0a1a]/80 text-white/40 hover:text-cyan-300 hover:border-cyan-400/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all flex items-center justify-center"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden />
                    </button>

                    {/* Vorschau */}
                    <div className="h-16 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/5 flex items-center justify-center mb-2.5">
                      <IconComp className="w-9 h-9 text-[#7dd8f5] drop-shadow-[0_0_8px_rgba(125,216,245,0.35)]" />
                    </div>

                    {/* Name + Herkunft */}
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-white/85 truncate">
                        {entry.name}
                      </span>
                    </div>
                    <span
                      className={`self-start text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border mb-1.5 ${setInfo.className}`}
                    >
                      {setInfo.label}
                    </span>

                    {/* Funktion */}
                    <p className="text-[11px] leading-snug text-white/55 line-clamp-3 mb-2">
                      {entry.desc}
                    </p>

                    {/* Einsatzorte */}
                    <div className="mt-auto flex flex-wrap gap-1">
                      {entry.areas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45"
                        >
                          {area}
                        </span>
                      ))}
                      {entry.areas.length > 3 && (
                        <span className="text-[9px] px-1 py-0.5 text-white/35">
                          +{entry.areas.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Kopieren-Hinweis bei Hover */}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 text-[9px] text-cyan-300/80 bg-cyan-400/10 rounded-b-xl py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Copy className="w-2.5 h-2.5" aria-hidden /> SVG kopieren
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Fußzeile: Einbau-Hinweis ── */}
        <div className="shrink-0 border-t border-white/10 p-3.5 flex items-start gap-2.5 text-[11px] text-white/50 bg-white/[0.02]">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400/70" aria-hidden />
          <p>
            <span className="text-white/70 font-medium">Eigene Icons einbauen:</span> Die
            pink markierten Icons stammen aus{' '}
            <code className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-cyan-200">src/components/icons.tsx</code>{' '}
            — dort einfach die SVG-Pfade durch eigene Zeichnungen ersetzen. Die
            cyan markierten Lucide-Icons werden pro Bildschirm importiert und können
            genauso ausgetauscht werden. Alle Icons nutzen{' '}
            <code className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-cyan-200">currentColor</code>{' '}
            und passen sich damit automatisch an jedes Theme an. Neue App-Icons
            (1024×1024) mit{' '}
            <code className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-cyan-200">bun run icons</code>{' '}
            für alle Größen generieren.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
