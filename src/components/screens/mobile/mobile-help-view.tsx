'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== i18n-Hilfsfunktion (R33-Konvention) =====================
// t(key) === key bedeutet "nicht übersetzt" → deutschen Fallback nutzen.
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Props =====================

interface MobileHelpViewProps {
  /** Schließen-Callback (X oben rechts). */
  onClose: () => void;
}

// ===================== R39/P3: Tutorial-Datenmodell =====================
// Wie die Touren der Haupt-App (src/lib/tutorial/): Kapitel → Schritte mit
// Titel, Text und optionalem „Mehr erfahren“-Detail. Im Gegensatz zum Desktop
// gibt es hier keine data-testid-Anker — die Schritte sind rein inhaltlich,
// komplett lokal und senden NIEMALS Befehle an den Desktop.

interface TutorialStep {
  id: string;
  icon: string;
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  detailsKey?: string;
  detailsFallback?: string;
}

interface TutorialChapter {
  id: string;
  icon: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  steps: TutorialStep[];
}

const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'start',
    icon: '🔌',
    titleKey: 'mobileTutorial.start.title',
    titleFallback: 'Erste Schritte',
    descKey: 'mobileTutorial.start.desc',
    descFallback: 'Verbinden, Profil anlegen und die App kennenlernen',
    steps: [
      {
        id: 'connect',
        icon: '📷',
        titleKey: 'mobileTutorial.start.s1.t',
        titleFallback: 'Mit dem Desktop verbinden',
        bodyKey: 'mobileTutorial.start.s1.b',
        bodyFallback: 'Scanne den QR-Code auf der Startseite des Desktops oder öffne den Companion-Link. Handy und PC müssen im selben WLAN sein — der Code oben rechts im Header bestätigt die Verbindung.',
        detailsKey: 'mobileTutorial.start.s1.d',
        detailsFallback: 'Geht die Verbindung verloren, verbindet sich die App automatisch neu. Prüfe sonst das WLAN und tippe auf „Verbindung wiederholen“.',
      },
      {
        id: 'profile',
        icon: '👤',
        titleKey: 'mobileTutorial.start.s2.t',
        titleFallback: 'Dein Spielerprofil',
        bodyKey: 'mobileTutorial.start.s2.b',
        bodyFallback: 'Lege ein Profil mit Name, Farbe und Foto an. Tippe oben links auf deinen Avatar, um es jederzeit zu bearbeiten — Synchronisation mit dem Desktop passiert automatisch.',
      },
      {
        id: 'app',
        icon: '📱',
        titleKey: 'mobileTutorial.start.s3.t',
        titleFallback: 'Die App im Überblick',
        bodyKey: 'mobileTutorial.start.s3.b',
        bodyFallback: 'Die Tab-Leiste unten führt dich durch alle Bereiche: Start, Bibliothek, Party, Challenge, Queue, Jukebox, Highscores, Erfolge und Einstellungen. Oben rechts findest du Hilfe (?) und Chat (💬).',
      },
      {
        id: 'modes',
        icon: '🎮',
        titleKey: 'mobileTutorial.start.s4.t',
        titleFallback: 'Spielmodi auf der Startseite',
        bodyKey: 'mobileTutorial.start.s4.b',
        bodyFallback: 'Die Kacheln zeigen die Spielmodi: Single (1 Spieler), Duell (2 Mics), Duett (2 Stimmen) und Party-Modus mit 9 Spielmodi für bis zu 32 Spieler. Ein Tipp öffnet die Bibliothek mit vorgewähltem Modus.',
      },
    ],
  },
  {
    id: 'songs',
    icon: '🎵',
    titleKey: 'mobileTutorial.songs.title',
    titleFallback: 'Songs wünschen',
    descKey: 'mobileTutorial.songs.desc',
    descFallback: 'Bibliothek durchsuchen, Modus und Gerät wählen, einreihen',
    steps: [
      {
        id: 'find',
        icon: '🔍',
        titleKey: 'mobileTutorial.songs.s1.t',
        titleFallback: 'Song finden',
        bodyKey: 'mobileTutorial.songs.s1.b',
        bodyFallback: 'In der Bibliothek suchst du per Suchfeld (Titel, Artist, Genre) oder filterst nach Genre, Sprache, Jahrzehnt und Viral-Hits. Ein Tipp auf einen Song öffnet die Song-Optionen.',
      },
      {
        id: 'mode',
        icon: '⚔️',
        titleKey: 'mobileTutorial.songs.s2.t',
        titleFallback: 'Modus & Schwierigkeit',
        bodyKey: 'mobileTutorial.songs.s2.b',
        bodyFallback: 'Oben wählst du Solo, Duell oder Duett (bei Duell/Duett zusätzlich einen Partner). Darunter stellst du die Schwierigkeit ein — der Desktop-Standard ist als Hinweis dabei.',
      },
      {
        id: 'device',
        icon: '🎤',
        titleKey: 'mobileTutorial.songs.s3.t',
        titleFallback: 'Gesangs-Gerät wählen',
        bodyKey: 'mobileTutorial.songs.s3.b',
        bodyFallback: '„Gesangs-Gerät“ legt fest, womit gesungen wird: 📱 Companion-App (dein Handy-Mikrofon — für verbundene Spieler vorausgewählt) oder 🎤 ein Mikrofon am Desktop. Auch dein Partner bekommt sein eigenes Gerät.',
        detailsKey: 'mobileTutorial.songs.s3.d',
        detailsFallback: 'Die Wahl wird mit dem Song in die Warteschlange gelegt — der Desktop weiß dann beim Start genau, welche Stimme von wo kommt.',
      },
      {
        id: 'queue',
        icon: '📋',
        titleKey: 'mobileTutorial.songs.s4.t',
        titleFallback: 'In die Warteschlange',
        bodyKey: 'mobileTutorial.songs.s4.b',
        bodyFallback: '„Zur Warteschlange hinzufügen“ reicht den Song ein — bis zu 3 Songs pro Spieler. Alternativ legst du den Song auf eine Playlist oder forderest jemanden per Chat heraus.',
      },
    ],
  },
  {
    id: 'queue',
    icon: '📋',
    titleKey: 'mobileTutorial.queue.title',
    titleFallback: 'Warteschlange',
    descKey: 'mobileTutorial.queue.desc',
    descFallback: 'Wünsche verwalten, sortieren und (steuernd) starten',
    steps: [
      {
        id: 'view',
        icon: '👀',
        titleKey: 'mobileTutorial.queue.s1.t',
        titleFallback: 'Die komplette Queue',
        bodyKey: 'mobileTutorial.queue.s1.b',
        bodyFallback: 'Der Queue-Tab zeigt alle Wünsche — auch die vom Desktop eingereihten Songs (🖥️-Kennzeichnung). Wer den Song gewünscht hat, siehst du am Avatar; 📱 heißt: gesungen wird über die Companion-App.',
      },
      {
        id: 'edit',
        icon: '✏️',
        titleKey: 'mobileTutorial.queue.s2.t',
        titleFallback: 'Entfernen & Sortieren',
        bodyKey: 'mobileTutorial.queue.s2.b',
        bodyFallback: 'Mit ✕ entfernst du deine eigenen Songs. Per Drag-and-Drop am Zieh-Griff (⠿) verschiebst du Songs an eine andere Position.',
        detailsKey: 'mobileTutorial.queue.s2.d',
        detailsFallback: 'Als steuerndes Gerät darfst du JEDEN Song entfernen und die komplette Reihenfolge neu ordnen.',
      },
      {
        id: 'control',
        icon: '🎮',
        titleKey: 'mobileTutorial.queue.s3.t',
        titleFallback: 'Steuernd: Songs starten',
        bodyKey: 'mobileTutorial.queue.s3.b',
        bodyFallback: 'Hältst du die Steuerung, bekommst du zwei Extra-Buttons: „Nächsten Song spielen“ startet den ersten Queue-Song, „Alle entfernen“ leert die komplette Warteschlange — plus einen ▶-Play-Button an jedem Song.',
      },
    ],
  },
  {
    id: 'singing',
    icon: '🎤',
    titleKey: 'mobileTutorial.singing.title',
    titleFallback: 'Singen mit dem Handy',
    descKey: 'mobileTutorial.singing.desc',
    descFallback: 'Handy als Mikrofon, Anzeige und Tipps',
    steps: [
      {
        id: 'auto',
        icon: '⚡',
        titleKey: 'mobileTutorial.singing.s1.t',
        titleFallback: 'Automatischer Start',
        bodyKey: 'mobileTutorial.singing.s1.b',
        bodyFallback: 'Bist du als Sänger dran, startet dein Mikrofon automatisch — im Party-Modus genauso wie im Companion-Singalong. Bei Battle Royale und Medley singen alle Companion-Spieler gleichzeitig.',
      },
      {
        id: 'display',
        icon: '📊',
        titleKey: 'mobileTutorial.singing.s2.t',
        titleFallback: 'Lautstärke & Tonanzeige',
        bodyKey: 'mobileTutorial.singing.s2.b',
        bodyFallback: 'Die Leiste unter dem Header zeigt live Lautstärke und die erkannte Note deines Gesangs. Im Spiel siehst du Lyrics, deine Pitch-Anzeige und den Punktestand gespiegelt.',
        detailsKey: 'mobileTutorial.singing.s2.d',
        detailsFallback: 'Beim ersten Mal fragt der Browser nach Mikrofon-Zugriff — tippe auf „Erlauben“. Die Berechtigung kannst du später in den Browser-Einstellungen der Seite ändern.',
      },
      {
        id: 'tips',
        icon: '💡',
        titleKey: 'mobileTutorial.singing.s3.t',
        titleFallback: 'Bessere Trefferquote',
        bodyKey: 'mobileTutorial.singing.s3.b',
        bodyFallback: 'Halte das Handy nah am Mund und sing laut & deutlich. Musik direkt am Gerät (Lautsprecher neben dem Handy) stört die Tonerkennung — Kopfhörer am Desktop sind ideal.',
      },
    ],
  },
  {
    id: 'party',
    icon: '🎉',
    titleKey: 'mobileTutorial.party.title',
    titleFallback: 'Party-Spiele',
    descKey: 'mobileTutorial.party.desc',
    descFallback: 'Reich das Mikro, Singalong, Battle Royale & Co.',
    steps: [
      {
        id: 'join',
        icon: '🚪',
        titleKey: 'mobileTutorial.party.s1.t',
        titleFallback: 'Mitmachen ohne Steuerung',
        bodyKey: 'mobileTutorial.party.s1.b',
        bodyFallback: 'Party-Spiele laufen am Desktop — du machst direkt vom Handy aus mit: Songs auswählen, abstimmen, singen. Eine Steuerung brauchst du dafür NICHT.',
      },
      {
        id: 'modes',
        icon: '🏆',
        titleKey: 'mobileTutorial.party.s2.t',
        titleFallback: 'Die Spielmodi',
        bodyKey: 'mobileTutorial.party.s2.b',
        bodyFallback: 'Reich das Mikro (ein Desktop-Mikro wandert durch alle), Companion-Singalong (jeder singt am Handy), Battle Royale, Medley, Turnier, Fehlende Wörter, Blind-Karaoke und Rate meinen Song.',
        detailsKey: 'mobileTutorial.party.s2.d',
        detailsFallback: 'Achtung: Bei „Reich das Mikro“ singt ALLE mit demselben Desktop-Mikrofon — das Handy dient dort nur als Fernbedienung und Spiegel.',
      },
      {
        id: 'vote',
        icon: '🗳️',
        titleKey: 'mobileTutorial.party.s3.t',
        titleFallback: 'Abstimmen & Songs wählen',
        bodyKey: 'mobileTutorial.party.s3.b',
        bodyFallback: 'Bei Song-Abstimmungen erscheinen die Kandidaten direkt auf deinem Handy — ein Tipp genügt. In der Party-Einrichtung siehst du Spieler, Mics und Einstellungen live gespiegelt und kannst (steuernd) alles vom Handy aus ändern.',
      },
    ],
  },
  {
    id: 'control',
    icon: '🎮',
    titleKey: 'mobileTutorial.control.title',
    titleFallback: 'Fernsteuerung & Chat',
    descKey: 'mobileTutorial.control.desc',
    descFallback: 'Desktop steuern, sperren, chatten',
    steps: [
      {
        id: 'take',
        icon: '🔓',
        titleKey: 'mobileTutorial.control.s1.t',
        titleFallback: 'Kontrolle übernehmen',
        bodyKey: 'mobileTutorial.control.s1.b',
        bodyFallback: '„Kontrolle übernehmen“ (Startseite) verbindet dein Handy mit dem Desktop: Deine Tabs steuern den PC — Start, Bibliothek, Party, Queue, Jukebox, Highscores, Erfolge und Einstellungen.',
      },
      {
        id: 'one',
        icon: '☝️',
        titleKey: 'mobileTutorial.control.s2.t',
        titleFallback: 'Nur ein Steuergerät',
        bodyKey: 'mobileTutorial.control.s2.b',
        bodyFallback: 'Genau EIN Gerät steuert gleichzeitig. Hält jemand anders die Steuerung, zeigt dir die Startseite, wer es ist. Mit „Kontrolle abgeben“ gibst du den Platz frei.',
        detailsKey: 'mobileTutorial.control.s2.d',
        detailsFallback: 'Bereiche mit 🔒 (Party, Challenge, Jukebox, Einstellungen) brauchen die Steuerung — dein eigenes Profil und die Bibliothek sind immer offen.',
      },
      {
        id: 'chat',
        icon: '💬',
        titleKey: 'mobileTutorial.control.s3.t',
        titleFallback: 'Chat & Extras',
        bodyKey: 'mobileTutorial.control.s3.b',
        bodyFallback: 'Tippe oben rechts auf 💬, um mit allen zu chatten — Herausforderungen landen direkt im Chat. Dazu gibt’s Jukebox-Wunschliste, Daily-Challenge, Highscores und Erfolge als eigene Tabs.',
      },
    ],
  },
];

// Abschluss pro Kapitel im localStorage (wie die Desktop-Touren).
const TOUR_DONE_KEY = 'kz-mobile-tour-done';

function readDoneChapters(): Set<string> {
  try {
    const raw = localStorage.getItem(TOUR_DONE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter(x => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeDoneChapters(done: Set<string>) {
  try {
    localStorage.setItem(TOUR_DONE_KEY, JSON.stringify(Array.from(done)));
  } catch { /* non-critical */ }
}

// Custom-Scrollbar (gleiche Neon-Optik wie die anderen Companion-Views, globals.css R38).
const SCROLL_AREA = 'overflow-y-auto overscroll-contain pr-1.5 -mr-1 kz-scroll';

// ===================== Komponente =====================

/**
 * R39/P3: MobileHelpView — interaktives Tutorial im Stil der Haupt-App:
 * Kapitelliste → schrittweise Tour mit Fortschritt, „Mehr erfahren“-Details
 * und Abschluss-Häkchen. Rein lokal: keine Commands, keine Desktop-Tutorials.
 */
export function MobileHelpView({ onClose }: MobileHelpViewProps) {
  const { t } = useTranslation();

  // Aktives Kapitel (null = Kapitelliste) + Schritt-Index
  const [activeChapter, setActiveChapter] = useState<TutorialChapter | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [doneChapters, setDoneChapters] = useState<Set<string>>(() => new Set());

  // localStorage erst nach Mount lesen (SSR/Hydration-Sicherheit)
  useEffect(() => {
    setDoneChapters(readDoneChapters());
  }, []);

  // Body-Scroll sperren, solange das Overlay offen ist
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const totalSteps = activeChapter?.steps.length ?? 0;
  const step = activeChapter?.steps[stepIndex] ?? null;
  const isLastStep = stepIndex >= totalSteps - 1;
  const progressPct = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;

  const doneCount = useMemo(
    () => TUTORIAL_CHAPTERS.filter(ch => doneChapters.has(ch.id)).length,
    [doneChapters]
  );

  const openChapter = (ch: TutorialChapter) => {
    setActiveChapter(ch);
    setStepIndex(0);
    setShowDetails(false);
  };

  const backToList = () => {
    // Kapitel gilt als abgeschlossen, sobald der letzte Schritt erreicht wurde
    if (activeChapter && isLastStep) {
      setDoneChapters(prev => {
        const next = new Set(prev);
        next.add(activeChapter.id);
        writeDoneChapters(next);
        return next;
      });
    }
    setActiveChapter(null);
    setStepIndex(0);
    setShowDetails(false);
  };

  const nextStep = () => {
    if (!activeChapter) return;
    if (isLastStep) {
      setDoneChapters(prev => {
        const next = new Set(prev);
        next.add(activeChapter.id);
        writeDoneChapters(next);
        return next;
      });
      setActiveChapter(null);
      setStepIndex(0);
      setShowDetails(false);
      return;
    }
    setStepIndex(i => i + 1);
    setShowDetails(false);
  };

  const resetTutorials = () => {
    setDoneChapters(new Set());
    writeDoneChapters(new Set());
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white animate-[help-fade-in_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={tOr(t, 'mobileHelp.title', 'Hilfe')}
    >
      {/* ===== Header ===== */}
      <div className="shrink-0 sticky top-0 z-10 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={activeChapter ? backToList : onClose}
              aria-label={activeChapter
                ? tOr(t, 'mobileTutorial.backToOverview', 'Zurück zur Übersicht')
                : tOr(t, 'mobileHelp.close', 'Schließen')}
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg text-white/70 active:scale-90 transition-transform"
            >
              {activeChapter ? '‹' : '✕'}
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">
                {activeChapter
                  ? tOr(t, activeChapter.titleKey, activeChapter.titleFallback)
                  : tOr(t, 'mobileHelp.title', 'Hilfe')}
              </h1>
              {activeChapter && (
                <p className="text-[11px] text-white/40">
                  {tOr(t, 'mobileTutorial.stepOf', 'Schritt {n} von {m}')
                    .replace('{n}', String(stepIndex + 1))
                    .replace('{m}', String(totalSteps))}
                </p>
              )}
            </div>
          </div>
          {!activeChapter && doneCount > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              ✓ {doneCount}/{TUTORIAL_CHAPTERS.length}
            </span>
          )}
        </div>
        {/* Fortschrittsbalken (nur in der Schritt-Ansicht) */}
        {activeChapter && (
          <div className="h-1 bg-white/10" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ===== Kapitelliste ===== */}
      {!activeChapter && (
        <div className={`flex-1 min-h-0 ${SCROLL_AREA}`}>
          <div className="flex flex-col gap-3 px-4 py-4 pb-10">
            <p className="text-xs text-white/40 leading-relaxed px-1">
              {tOr(t, 'mobileTutorial.intro', 'Begleitete Tutorials für die Companion-App — Kapitel für Kapitel in wenigen Minuten. Wie in der Haupt-App, nur für dein Handy.')}
            </p>

            {TUTORIAL_CHAPTERS.map((chapter, chIdx) => {
              const done = doneChapters.has(chapter.id);
              return (
                <button
                  key={chapter.id}
                  onClick={() => openChapter(chapter)}
                  className={
                    'flex items-center gap-3 rounded-2xl border p-4 text-left active:scale-[0.98] transition-all ' +
                    (done
                      ? 'bg-emerald-500/[0.07] border-emerald-500/25'
                      : 'bg-white/5 border-white/10')
                  }
                >
                  <span
                    className={
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ' +
                      (done ? 'bg-emerald-500/20' : 'bg-gradient-to-br from-cyan-500/25 to-purple-500/25')
                    }
                    aria-hidden="true"
                  >
                    {chapter.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {tOr(t, chapter.titleKey, chapter.titleFallback)}
                      </span>
                      {done && <span className="shrink-0 text-xs text-emerald-400" aria-label="erledigt">✓</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/45 leading-snug">
                      {tOr(t, chapter.descKey, chapter.descFallback)}
                    </span>
                    <span className="mt-1 block text-[10px] text-white/30">
                      {tOr(t, 'mobileTutorial.stepCount', '{n} Schritte').replace('{n}', String(chapter.steps.length))}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/25 text-sm" aria-hidden="true">›</span>
                  <span className="sr-only">{`${chIdx + 1}. ${tOr(t, chapter.titleKey, chapter.titleFallback)}`}</span>
                </button>
              );
            })}

            {doneCount > 0 && (
              <button
                onClick={resetTutorials}
                className="mt-1 self-center rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[11px] text-white/45 active:scale-95 transition-transform"
              >
                ↺ {tOr(t, 'mobileTutorial.reset', 'Tutorials zurücksetzen')}
              </button>
            )}

            <p className="text-center text-[10px] text-white/25 px-6 pt-1 leading-relaxed">
              {tOr(t, 'mobileHelp.localOnlyNote', 'Diese Hilfe läuft komplett auf deinem Handy — sie steuert den Desktop nicht.')}
            </p>
          </div>
        </div>
      )}

      {/* ===== Schritt-Ansicht ===== */}
      {activeChapter && step && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={`flex-1 min-h-0 ${SCROLL_AREA}`}>
            <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
              {/* Schritt-Icon mit Glow */}
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-4xl shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                aria-hidden="true"
              >
                {step.icon}
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">
                {tOr(t, step.titleKey, step.titleFallback)}
              </h2>
              <p className="text-sm text-white/65 leading-relaxed">
                {tOr(t, step.bodyKey, step.bodyFallback)}
              </p>

              {/* Mehr erfahren (aufklappbar) */}
              {step.detailsKey && (
                <div className="w-full rounded-xl border border-white/10 bg-white/5">
                  <button
                    onClick={() => setShowDetails(v => !v)}
                    aria-expanded={showDetails}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <span className="text-xs font-semibold text-cyan-300">
                      💡 {tOr(t, 'mobileTutorial.moreDetails', 'Mehr erfahren')}
                    </span>
                    <span
                      className={'text-white/40 text-xs transition-transform duration-200 ' + (showDetails ? 'rotate-180' : '')}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>
                  <div
                    className={
                      'grid transition-[grid-template-rows] duration-200 ease-out ' +
                      (showDetails ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')
                    }
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-3.5 text-left text-xs text-white/55 leading-relaxed">
                        {tOr(t, step.detailsKey, step.detailsFallback || '')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fußleiste: Punkte + Zurück/Weiter */}
          <div className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {/* Fortschritts-Punkte */}
            <div className="mb-3 flex items-center justify-center gap-1.5" aria-hidden="true">
              {activeChapter.steps.map((s, i) => (
                <span
                  key={s.id}
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (i < stepIndex ? 'w-1.5 bg-cyan-400/60' : i === stepIndex ? 'w-5 bg-cyan-400' : 'w-1.5 bg-white/15')
                  }
                />
              ))}
            </div>
            <div className="flex gap-2.5">
              {stepIndex > 0 && (
                <button
                  onClick={() => { setStepIndex(i => Math.max(0, i - 1)); setShowDetails(false); }}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 active:scale-[0.97] transition-transform"
                >
                  {tOr(t, 'mobileTutorial.back', 'Zurück')}
                </button>
              )}
              <button
                onClick={nextStep}
                data-testid="mobile-tutorial-next"
                className={
                  'flex-[2] rounded-xl px-4 py-3 text-sm font-bold active:scale-[0.97] transition-transform ' +
                  (isLastStep
                    ? 'bg-gradient-to-r from-emerald-500/40 to-green-500/40 border border-emerald-400/40 text-emerald-200'
                    : 'bg-gradient-to-r from-cyan-500/40 to-purple-500/40 border border-cyan-400/40 text-cyan-100')
                }
              >
                {isLastStep
                  ? `✓ ${tOr(t, 'mobileTutorial.finish', 'Fertig')}`
                  : tOr(t, 'mobileTutorial.next', 'Weiter')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes help-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
MobileHelpView.displayName = 'MobileHelpView';
