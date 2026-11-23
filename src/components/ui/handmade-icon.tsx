'use client';

import React from 'react';
import { handmadeIcon } from '@/lib/game/handmade-icons';

/**
 * Rendert eine handgemachte Grafik (public/icons/handmade/) für eine stabile
 * Spiel-ID — oder `null`, wenn für diese ID keine Grafik existiert.
 *
 * Die Größe skaliert standardmäßig mit der Schriftgröße des umgebenden
 * Kontexts (h-[1.3em] w-[1.3em]) und verhält sich dadurch wie ein Emoji.
 * Über `className` kann eine feste Größe gesetzt werden (z. B. "h-9 w-9").
 */
export function HandmadeIcon({
  id,
  className = '',
  style,
}: {
  id: string | undefined | null;
  /** Zusätzliche Klassen; Standardgröße folgt der Schrift (em-basiert). */
  className?: string;
  style?: React.CSSProperties;
}) {
  const src = handmadeIcon(id);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={`inline-block h-[1.3em] w-[1.3em] shrink-0 rounded-[15%] object-contain align-[-0.22em] ${className}`}
      style={style}
    />
  );
}

/**
 * Zeigt die handgemachte Grafik für `id`, wenn vorhanden — ansonsten das
 * bisherige Emoji als Fallback. Die Standard-Größenklasse folgt der
 * Schriftgröße (wie ein Emoji); `className` gilt für beide Varianten.
 */
export function IconWithFallback({
  id,
  emoji,
  className = '',
}: {
  id: string | undefined | null;
  emoji: string;
  className?: string;
}) {
  if (handmadeIcon(id)) {
    return <HandmadeIcon id={id} className={className} />;
  }
  return <span className={className}>{emoji}</span>;
}
