'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Song } from '@/types/game';
import { SongCardProps } from './types';
import { SongCard } from './song-card';
import { useRovingFocus } from '@/hooks/use-roving-focus';

/**
 * VirtualizedSongGrid
 *
 * Renders a responsive CSS grid of SongCards with row-level virtualization.
 * Only visible rows are mounted in the DOM, keeping memory and CPU usage low
 * even with 10,000+ songs while preserving cover image thumbnails.
 *
 * Column count matches the Tailwind responsive breakpoints used elsewhere
 * in the library so the layout is pixel-identical to the non-virtualized grid.
 */

// Tailwind breakpoint → column count mapping (matches library-screen.tsx)
const BREAKPOINTS: [number, number][] = [
  [1536, 7], // 2xl
  [1280, 6], // xl
  [1024, 5], // lg
  [768, 4],  // md
  [640, 3],  // sm
  [0, 2],    // xs
];

const GAP = 16; // gap-4 = 1rem = 16px
// Horizontal padding inside each row grid (px-6 = 24px each side).
// Creates a dead zone at the left/right edges where scrolling does NOT
// trigger onMouseEnter on any SongCard, preventing accidental previews.
const HORIZONTAL_PADDING = 48;

function getColumnCount(width: number): number {
  for (const [bp, cols] of BREAKPOINTS) {
    if (width >= bp) return cols;
  }
  return 2;
}

function getGridColsClass(cols: number): string {
  const map: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
  };
  return map[cols] || 'grid-cols-2';
}

// Approximate info-section height below the square cover image:
// p-3 (12px) top + h3 (~20px line-height) + p text (~16px) + p-3 bottom (12px) = ~60px
// Plus border (1px) ≈ 61px. Use a small buffer.
const INFO_SECTION_HEIGHT = 68;

interface VirtualizedSongGridProps {
  songs: Song[];
  songCardProps: Omit<SongCardProps, 'song'>;
  /** Optional custom card renderer (e.g. playlist view with remove button overlay) */
  renderSongCard?: (_song: Song) => React.ReactNode;
  /** Callback when a song is activated via keyboard (Enter/Space) */
  onSongSelect?: (_index: number) => void;
}

export function VirtualizedSongGrid({ songs, songCardProps, renderSongCard, onSongSelect }: VirtualizedSongGridProps) {
  // Refs for stable callbacks passed to useRovingFocus.
  // These bridge the hook call (which happens before columns/rowVirtualizer
  // are computed) with the values that are only available later in the render.
  const columnsRef = useRef(2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowVirtualizerRef = useRef<any>(null);
  const onSongSelectRef = useRef(onSongSelect);
  onSongSelectRef.current = onSongSelect;

  // Stable callbacks that read from refs — avoids recreating the hook's
  // internal effects on every render while always using the latest values.
  const stableOnFocusChange = useCallback((index: number) => {
    const rv = rowVirtualizerRef.current;
    if (rv) {
      const row = Math.floor(index / columnsRef.current);
      rv.scrollToIndex(row, { align: 'auto' });
    }
  }, []);

  const stableOnSelect = useCallback((index: number) => {
    onSongSelectRef.current?.(index);
  }, []);

  // Set up roving-focus keyboard navigation early so its containerRef
  // can be shared with the virtualizer and measurement logic below.
  const { containerRef, containerProps, getItemProps } = useRovingFocus({
    itemCount: songs.length,
    columns: 0, // auto-compute from container width
    onSelect: stableOnSelect,
    onFocusChange: stableOnFocusChange,
    loop: true,
    orientation: 'grid',
    ariaLabel: 'Song-Auswahl',
  });

  const [containerWidth, setContainerWidth] = useState(1200);
  const [containerHeight, setContainerHeight] = useState(600);

  // Measure container dimensions dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const top = el.getBoundingClientRect().top;
      setContainerHeight(Math.max(400, window.innerHeight - top));
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
      updateHeight();
    });

    updateHeight();
    observer.observe(el);
    window.addEventListener('resize', updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Use effective width (minus horizontal padding) for column count and sizing
  const effectiveWidth = containerWidth - HORIZONTAL_PADDING;
  const columns = getColumnCount(effectiveWidth);
  const rowCount = Math.ceil(songs.length / columns);

  // Keep ref in sync so the stable onFocusChange callback uses fresh values
  columnsRef.current = columns;

  // Calculate row height: each card = square cover (width) + info section
  const columnWidth = (effectiveWidth - (columns - 1) * GAP) / columns;
  const cardHeight = columnWidth + INFO_SECTION_HEIGHT;
  const rowHeight = cardHeight + GAP; // card + gap

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    overscan: 3, // render 3 extra rows above and below for smooth scrolling
  });

  // Keep ref in sync so the stable onFocusChange callback uses fresh virtualizer
  rowVirtualizerRef.current = rowVirtualizer;

  const gridColsClass = getGridColsClass(columns);

  // Build row→songs mapping (memoized)
  const rowSongs = useMemo(() => {
    const map = new Map<number, Song[]>();
    for (let r = 0; r < rowCount; r++) {
      const start = r * columns;
      const end = Math.min(start + columns, songs.length);
      map.set(r, songs.slice(start, end));
    }
    return map;
  }, [songs, columns, rowCount]);

  if (songs.length === 0) return null;

  return (
    <div
      {...containerProps}
      className="overflow-y-auto"
      style={{
        height: containerHeight,
      }}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const items = rowSongs.get(virtualRow.index);
          if (!items) return null;

          return (
            <div
              key={virtualRow.key}
              className={`grid ${gridColsClass} gap-4 px-6`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${containerWidth}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {items.map((song, colIndex) => {
                const songIndex = virtualRow.index * columns + colIndex;
                return renderSongCard ? (
                  <React.Fragment key={song.id}>{renderSongCard(song)}</React.Fragment>
                ) : (
                  <SongCard
                    key={song.id}
                    song={song}
                    {...songCardProps}
                    itemProps={getItemProps(songIndex)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
