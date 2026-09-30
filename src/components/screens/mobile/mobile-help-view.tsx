'use client';

import React, { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== i18n-Hilfsfunktion (R33-Konvention) =====================
// Neue Keys zusätzlich in src/lib/i18n/pending-keys/r33-c.json pflegen.
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Props =====================

interface MobileHelpViewProps {
  /** Schließen-Callback (X oben rechts). */
  onClose: () => void;
}

// ===================== Datenmodell =====================

interface HelpChapter {
  id: string;
  icon: string;
  titleKey: string;
  titleFallback: string;
  items: Array<{ key: string; fallback: string }>;
}

/**
 * R33/P19: Die fünf Hilfe-Kapitel. WICHTIG: Diese Sicht ist REIN LOKAL —
 * sie sendet NIEMALS Befehle an den Desktop und löst NIEMALS Desktop-
 * Tutorials aus (keine remote_commands, keine Custom-Events).
 */
const HELP_CHAPTERS: HelpChapter[] = [
  {
    id: 'connection',
    icon: '🔌',
    titleKey: 'mobileHelp.ch1Title',
    titleFallback: 'Verbindung & Mikrofon',
    items: [
      { key: 'mobileHelp.ch1b1', fallback: 'Scanne den QR-Code auf dem Desktop oder öffne den Companion-Link — Handy und PC müssen im selben WLAN sein.' },
      { key: 'mobileHelp.ch1b2', fallback: 'Lege ein Profil an (Name, Farbe, Foto) — es wird automatisch mit dem Desktop synchronisiert.' },
      { key: 'mobileHelp.ch1b3', fallback: 'Beim ersten Singen fragt der Browser nach Mikrofon-Zugriff — tippe auf „Erlauben“.' },
      { key: 'mobileHelp.ch1b4', fallback: 'Der Code oben rechts im Header zeigt dir, dass die Verbindung steht.' },
    ],
  },
  {
    id: 'remote-control',
    icon: '🎮',
    titleKey: 'mobileHelp.ch2Title',
    titleFallback: 'Fernsteuerung: Kontrolle übernehmen',
    items: [
      { key: 'mobileHelp.ch2b1', fallback: 'Mit „Kontrolle übernehmen“ spiegelt dein Handy den Desktop-Bildschirm — du siehst immer, was am PC läuft.' },
      { key: 'mobileHelp.ch2b2', fallback: 'Deine Tab-Leiste steuert dann den Desktop: Start, Bibliothek, Party, Queue, Jukebox, Highscores, Erfolge, Einstellungen.' },
      { key: 'mobileHelp.ch2b3', fallback: 'Auf der Startseite kannst du den laufenden Song pausieren oder überspringen.' },
      { key: 'mobileHelp.ch2b4', fallback: 'Nur EIN Gerät steuert gleichzeitig — „Kontrolle abgeben“ gibt den Platz frei.' },
    ],
  },
  {
    id: 'no-control',
    icon: '📱',
    titleKey: 'mobileHelp.ch3Title',
    titleFallback: 'Ohne Steuerung',
    items: [
      { key: 'mobileHelp.ch3b1', fallback: 'Songs wünschen: Bibliothek öffnen, Song antippen, Optionen (Modus, Schwierigkeit, Mikro) wählen und in die Queue legen — bis zu 3 Songs.' },
      { key: 'mobileHelp.ch3b2', fallback: 'Chat: Tippe oben rechts auf 💬 und schreibe mit Host und anderen Spielern.' },
      { key: 'mobileHelp.ch3b3', fallback: 'Party: Du stimmst bei Song-Abstimmungen ab, siehst Turn-Signale und singst mit, wenn du dran bist — alles per Overlay, ganz ohne Steuerung.' },
      { key: 'mobileHelp.ch3b4', fallback: 'Eigene Erfolge und Highscores findest du in der Tab-Leiste (🏅 Erfolge, 🏆 Highscores).' },
      { key: 'mobileHelp.ch3b5', fallback: 'Bereiche mit Schloss (Einstellungen, Profile, Party, Challenge, Jukebox) brauchen die Fernsteuerung — dein eigenes Profil kannst du immer bearbeiten.' },
    ],
  },
  {
    id: 'singing',
    icon: '🎤',
    titleKey: 'mobileHelp.ch4Title',
    titleFallback: 'Singen mit dem Handy',
    items: [
      { key: 'mobileHelp.ch4b1', fallback: 'Ist dein Part im Spiel, startet das Mikrofon automatisch — bei Battle Royale singen alle gleichzeitig.' },
      { key: 'mobileHelp.ch4b2', fallback: 'Die schmale Leiste unter dem Header zeigt Lautstärke und die erkannte Note deines Gesangs.' },
      { key: 'mobileHelp.ch4b3', fallback: 'Halte das Handy nah am Mund und halte Lautsprecher-Musik direkt am Gerät fern.' },
    ],
  },
  {
    id: 'troubleshooting',
    icon: '🛠️',
    titleKey: 'mobileHelp.ch5Title',
    titleFallback: 'Fehlerbehebung',
    items: [
      { key: 'mobileHelp.ch5b1', fallback: 'Verbindung verloren: Die App verbindet sich automatisch neu. Prüfe sonst das WLAN und tippe auf „Verbindung wiederholen“.' },
      { key: 'mobileHelp.ch5b2', fallback: 'Kein Mikrofon/Ton: Prüfe die Mikrofon-Berechtigung in den Browser-Einstellungen der Seite.' },
      { key: 'mobileHelp.ch5b3', fallback: 'Spiegel bleibt leer: Der Desktop (PC-App) muss laufen und im selben Netz sein.' },
      { key: 'mobileHelp.ch5b4', fallback: 'Steuerung reagiert nicht: Ein anderes Gerät hat die Kontrolle — die Statuskarte auf der Startseite zeigt, wer steuert.' },
    ],
  },
];

// Custom-Scrollbar (gleiche Optik wie die anderen Companion-Views).
const SCROLL_AREA =
  'overflow-y-auto overscroll-contain pr-1.5 -mr-1 ' +
  '[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent] ' +
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20';

// ===================== Komponente =====================

/**
 * R33/P19: MobileHelpView — Vollbild-Overlay mit scrollbarem Reader.
 * Rein lokal: keine Commands, keine Desktop-Tutorials — nur Text.
 */
export function MobileHelpView({ onClose }: MobileHelpViewProps) {
  const { t } = useTranslation();

  // Body-Scroll sperren, solange das Overlay offen ist
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white animate-[help-fade-in_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={tOr(t, 'mobileHelp.title', 'Hilfe')}
    >
      {/* Header mit Titel + Schließen-Button (X) oben rechts */}
      <div className="shrink-0 sticky top-0 z-10 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">❓</span>
            <h1 className="text-base font-bold text-white truncate">
              {tOr(t, 'mobileHelp.title', 'Hilfe')}
            </h1>
          </div>
          <button
            onClick={onClose}
            aria-label={tOr(t, 'mobileHelp.close', 'Schließen')}
            className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg text-white/70 active:scale-90 transition-transform"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollbarer Reader (max-h + overflow-y-auto + Custom-Scrollbar) */}
      <div className={`flex-1 min-h-0 ${SCROLL_AREA}`}>
        <div className="flex flex-col gap-3 px-4 py-4 pb-10">

          {/* Intro-Zeile */}
          <p className="text-xs text-white/40 leading-relaxed px-1">
            {tOr(t, 'mobileHelp.intro', 'Companion-App: Alles Wichtige zu Verbindung, Fernsteuerung, Mitspielen und Singen — in fünf kurzen Kapiteln.')}
          </p>

          {HELP_CHAPTERS.map((chapter, chIdx) => (
            <section
              key={chapter.id}
              className="rounded-2xl bg-white/5 border border-white/10 p-4"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-xl shrink-0">{chapter.icon}</span>
                <h2 className="min-w-0 flex-1 text-sm font-bold text-white">
                  <span className="text-white/30 mr-1.5">{chIdx + 1}.</span>
                  {tOr(t, chapter.titleKey, chapter.titleFallback)}
                </h2>
              </div>
              <ul className="flex flex-col gap-2.5">
                {chapter.items.map((item, itemIdx) => (
                  <li key={item.key} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70"
                    />
                    <p className="min-w-0 flex-1 text-xs text-white/70 leading-relaxed">
                      {tOr(t, item.key, item.fallback)}
                    </p>
                    <span className="sr-only">{itemIdx + 1}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Footer-Hinweis: Hilfe ist rein lokal */}
          <p className="text-center text-[10px] text-white/25 px-6 pt-1 leading-relaxed">
            {tOr(t, 'mobileHelp.localOnlyNote', 'Diese Hilfe läuft komplett auf deinem Handy — sie steuert den Desktop nicht.')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes help-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}MobileHelpView.displayName = 'MobileHelpView';
