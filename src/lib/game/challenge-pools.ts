// Challenge pools — 200 daily challenge types + 100 weekly challenge types.
//
// The pools use compact builder helpers and *parametrized i18n patterns*
// (e.g. "Sing a {genre} song and reach {n}+ accuracy") so that hundreds of
// variants share a small set of translation keys. Individual names are still
// unique per type for variety.
//
// Category challenges (genre / language / decade / song-shape / …) use the
// song's metadata instead of pure performance metrics. Their `metricKey` is
// 'accuracy' — the category acts as an additional gate, and the per-difficulty
// targets scale the required accuracy (so the difficulty selector stays
// meaningful for them too).

import type { DailyGate, DailyMetricKey } from './daily-challenge';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** selectable difficulty — shared by daily + weekly challenges */
export type DailyDifficulty = 'easy' | 'normal' | 'hard' | 'very_hard' | 'insane';

/** categorical song requirement checked against the sung song's metadata */
export type DailyCategoryField =
  | 'genre' | 'language' | 'languageNot' | 'atypicalLanguage'
  | 'decade' | 'yearBefore'
  | 'durationMinMinutes' | 'durationMaxMinutes'
  | 'titleStartsRange' | 'titleContains' | 'oneWordTitle' | 'titleHasDigit' | 'questionTitle'
  | 'featuredArtist' | 'bandArtist' | 'artistStartsRange'
  | 'bpmMin' | 'bpmMax'
  | 'freshSong' | 'recentlyAdded'
  | 'songRating' | 'songDifficulty'
  | 'coopPartner';

export interface DailyCategory {
  field: DailyCategoryField;
  value?: string | number;
}

/** song metadata context used for category evaluation */
export interface DailySongContext {
  title?: string;
  artist?: string;
  genre?: string;
  language?: string;
  year?: number;
  durationMs?: number;
  bpm?: number;
  rating?: number;
  difficulty?: string;
  lastPlayed?: number;
  dateAdded?: number;
  /** number of players that sang (coop detection) */
  playerCount?: number;
}

/** static definition of one daily challenge variant */
export interface DailyTypeDefinition {
  id: string;
  icon: string;
  nameKey: string;
  /** description with `{n}` placeholder for the scaled target */
  descriptionKey: string;
  /** static interpolation params for the name (e.g. {genre}) */
  nameParams?: Record<string, string>;
  /** static interpolation params for the description (e.g. {m} gate values) */
  descriptionParams?: Record<string, string>;
  metricKey: DailyMetricKey;
  /** 'max' = higher is better, 'min' = lower is better (e.g. missed notes) */
  direction: 'max' | 'min';
  /** base target per difficulty (before level scaling) */
  targets: Record<DailyDifficulty, number>;
  /** upper bound after level scaling (percent metrics: 99) */
  cap?: number;
  /** difficulty-independent side conditions */
  gates?: DailyGate[];
  /** optional categorical song requirement */
  category?: DailyCategory;
}

/** static definition of one weekly challenge variant */
export interface WeeklyTypeDefinition {
  id: string;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  nameParams?: Record<string, string>;
  descriptionParams?: Record<string, string>;
  metricKey: DailyMetricKey;
  direction: 'max' | 'min';
  /** 'best' = best single song this week, 'sum' = accumulated across the week */
  aggregation: 'best' | 'sum';
  targets: Record<DailyDifficulty, number>;
  cap?: number;
  gates?: DailyGate[];
  category?: DailyCategory;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** expand 5 numbers into the per-difficulty target record */
const T = (easy: number, normal: number, hard: number, very_hard: number, insane: number): Record<DailyDifficulty, number> =>
  ({ easy, normal, hard, very_hard, insane });

// ---------------------------------------------------------------------------
// Global difficulty easing (user feedback 2026-09: "die Daily Challenges sind
// noch zu schwer — easy soll bei 30 % Genauigkeit anfangen, insane bei 75 %").
// Percent metrics (accuracy / tickAccuracy) use FIXED anchors for every daily
// type, everything else is eased multiplicatively per difficulty. Gates and
// their {m} description params are eased with matching factors so the
// displayed text always agrees with the actual gate check.
// ---------------------------------------------------------------------------

/** fixed percent anchors: easy 30 % → insane 75 % */
const PERCENT_TARGETS: Record<DailyDifficulty, number> =
  T(30, 45, 55, 65, 75);

/** multiplicative easing for 'max' metrics (lower target = easier) */
const EASE_MAX: Record<DailyDifficulty, number> =
  T(0.60, 0.70, 0.80, 0.86, 0.92);

/** multiplicative easing for 'min' metrics — allowed misses become MORE forgiving */
const EASE_MIN: Record<DailyDifficulty, number> =
  T(1.50, 1.35, 1.25, 1.15, 1.10);

/** gate easing: '>= accuracy' gates demand less … */
const GATE_EASE_PCT = 0.75;
/** … '>=' count gates demand less … */
const GATE_EASE_COUNT = 0.75;
/** … '<=' missed-notes gates allow more … */
const GATE_EASE_MISS_MAX = 1.4;

/** friendly rounding for eased targets / gate counts */
function roundTargetValue(value: number): number {
  if (value >= 5000) return Math.round(value / 100) * 100;
  if (value >= 500) return Math.round(value / 50) * 50;
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 20) return Math.round(value / 5) * 5;
  return Math.max(1, Math.round(value));
}

/** ease one target value for a given metric/direction/difficulty */
function easeTarget(metricKey: DailyMetricKey, direction: 'max' | 'min', difficulty: DailyDifficulty, value: number): number {
  if (metricKey === 'accuracy' || metricKey === 'tickAccuracy') return PERCENT_TARGETS[difficulty];
  const factor = direction === 'min' ? EASE_MIN[difficulty] : EASE_MAX[difficulty];
  const eased = value * factor;
  // 'min' types (allowed misses) round UP so easing never tightens a target
  return direction === 'min' ? Math.ceil(eased) : roundTargetValue(eased);
}

/** ease the gates of a daily type so they stay consistent with the new targets */
function easeGates(gates: DailyGate[] | undefined): DailyGate[] | undefined {
  if (!gates || gates.length === 0) return gates;
  return gates.map(g => {
    let factor = GATE_EASE_COUNT;
    if (g.metricKey === 'accuracy' || g.metricKey === 'tickAccuracy') factor = GATE_EASE_PCT;
    else if (g.metricKey === 'notesMissed') factor = g.op === '<=' ? GATE_EASE_MISS_MAX : GATE_EASE_COUNT;
    const raw = g.value * factor;
    const eased = (g.metricKey === 'accuracy' || g.metricKey === 'tickAccuracy')
      ? Math.round(raw)
      : g.op === '<=' ? Math.ceil(raw) : roundTargetValue(raw);
    return { ...g, value: eased };
  });
}

/** ease the {m} description param with the same factor as its gate */
function easeDescriptionParams(
  params: Record<string, string> | undefined,
  gates: DailyGate[] | undefined,
): Record<string, string> | undefined {
  if (!params || params.m === undefined) return params;
  const raw = String(params.m);
  const isPct = raw.trim().endsWith('%');
  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return params;
  const op = gates?.[0]?.op ?? '>=';
  let eased: number;
  if (isPct) {
    eased = Math.round(num * GATE_EASE_PCT);
  } else if (op === '<=') {
    eased = Math.ceil(num * GATE_EASE_MISS_MAX);
  } else {
    eased = roundTargetValue(num * GATE_EASE_COUNT);
  }
  return { ...params, m: isPct ? `${eased}%` : String(eased) };
}

/** standard accuracy targets for category challenges (the song must match + this accuracy) */
const CAT_ACC: Record<DailyDifficulty, number> = PERCENT_TARGETS;

/** language code → name normalization (songs may store either form) */
const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'english', de: 'german', es: 'spanish', fr: 'french', it: 'italian',
  pt: 'portuguese', ja: 'japanese', ko: 'korean', zh: 'chinese', ru: 'russian',
  nl: 'dutch', pl: 'polish', tr: 'turkish', ar: 'arabic', sv: 'swedish',
  la: 'latin', no: 'norwegian', da: 'danish', fi: 'finnish', hi: 'hindi',
  th: 'thai', id: 'indonesian',
};

function normalizeLanguage(value?: string): string {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[v] ?? v;
}

/** genre aliases for category matching — keeps legacy library data compatible
 *  with the harmonized main categories ('Hip-Hop' → 'Rap', 'Jazz' → 'R&B'). */
const GENRE_MATCH_ALIASES: Record<string, string> = {
  'hip-hop': 'rap', 'hip hop': 'rap', 'hiphop': 'rap', 'trap': 'rap',
  'jazz': 'r&b', 'vocal jazz': 'r&b', 'smooth jazz': 'r&b', 'bebop': 'r&b',
  'swing': 'r&b', 'big band': 'r&b', 'jazz fusion': 'r&b',
  'dance': 'electronic', 'edm': 'electronic', 'disco': 'electronic',
  'indie': 'pop', 'gospel': 'soul', 'opera': 'classical',
};

function normalizeGenre(value?: string): string {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  return GENRE_MATCH_ALIASES[v] ?? v;
}

/** Evaluate a categorical requirement against the sung song's metadata. */
export function matchesDailyCategory(
  category: DailyCategory,
  song: DailySongContext | undefined,
  appLanguage?: string,
): boolean {
  if (!song) return false;
  switch (category.field) {
    case 'genre':
      return normalizeGenre(song.genre) === normalizeGenre(String(category.value));
    case 'language':
      return normalizeLanguage(song.language) === normalizeLanguage(String(category.value));
    case 'languageNot':
      return normalizeLanguage(song.language) !== normalizeLanguage(String(category.value))
        && !!song.language;
    case 'atypicalLanguage': {
      const songLang = normalizeLanguage(song.language);
      if (!songLang || songLang === 'english') return false;
      const app = normalizeLanguage(appLanguage ?? 'en');
      return songLang !== app;
    }
    case 'decade': {
      const decade = Number(category.value);
      return typeof song.year === 'number' && song.year >= decade && song.year <= decade + 9;
    }
    case 'yearBefore':
      return typeof song.year === 'number' && song.year < Number(category.value);
    case 'durationMinMinutes':
      return typeof song.durationMs === 'number' && song.durationMs >= Number(category.value) * 60_000;
    case 'durationMaxMinutes':
      return typeof song.durationMs === 'number' && song.durationMs > 0
        && song.durationMs <= Number(category.value) * 60_000;
    case 'titleStartsRange': {
      const first = (song.title ?? '').trim().charAt(0).toUpperCase();
      return category.value === 'A-M' ? /[A-M]/.test(first) : /[N-Z]/.test(first);
    }
    case 'titleContains':
      return (song.title ?? '').toLowerCase().includes(String(category.value).toLowerCase());
    case 'oneWordTitle':
      return (song.title ?? '').trim().replace(/[^\p{L}\p{N}'-]/gu, ' ').trim().split(/\s+/).length === 1;
    case 'titleHasDigit':
      return /\d/.test(song.title ?? '');
    case 'questionTitle':
      return (song.title ?? '').includes('?');
    case 'featuredArtist':
      return /\bfeat\.?\b|\bft\.?\b/i.test(song.artist ?? '');
    case 'bandArtist': {
      const cleaned = (song.artist ?? '').replace(/feat\.?.*$/i, '').trim();
      return cleaned.split(/\s+/).filter(Boolean).length >= 2;
    }
    case 'artistStartsRange': {
      const first = (song.artist ?? '').trim().charAt(0).toUpperCase();
      return category.value === 'A-M' ? /[A-M]/.test(first) : /[N-Z]/.test(first);
    }
    case 'bpmMin':
      return typeof song.bpm === 'number' && song.bpm >= Number(category.value);
    case 'bpmMax':
      return typeof song.bpm === 'number' && song.bpm > 0 && song.bpm <= Number(category.value);
    case 'freshSong':
      return song.lastPlayed === undefined || song.lastPlayed === null;
    case 'recentlyAdded':
      return typeof song.dateAdded === 'number'
        && Date.now() - song.dateAdded <= 60 * 24 * 60 * 60 * 1000;
    case 'songRating':
      return song.rating === Number(category.value);
    case 'songDifficulty':
      return (song.difficulty ?? '').toLowerCase() === String(category.value).toLowerCase();
    case 'coopPartner':
      return (song.playerCount ?? 1) >= 2;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// DAILY POOL — 200 types
// ---------------------------------------------------------------------------

const P = {
  score: 'dailyTypes.patterns.score',
  accuracy: 'dailyTypes.patterns.accuracy',
  combo: 'dailyTypes.patterns.combo',
  perfect: 'dailyTypes.patterns.perfect',
  golden: 'dailyTypes.patterns.golden',
  notes: 'dailyTypes.patterns.notes',
  missMax: 'dailyTypes.patterns.missMax',
  tick: 'dailyTypes.patterns.tick',
  scoreAcc: 'dailyTypes.patterns.scoreAcc',
  scoreCombo: 'dailyTypes.patterns.scoreCombo',
  scoreMiss: 'dailyTypes.patterns.scoreMiss',
  accNotes: 'dailyTypes.patterns.accNotes',
  accCombo: 'dailyTypes.patterns.accCombo',
  accGolden: 'dailyTypes.patterns.accGolden',
  accMiss: 'dailyTypes.patterns.accMiss',
  accPerfect: 'dailyTypes.patterns.accPerfect',
  comboAcc: 'dailyTypes.patterns.comboAcc',
  comboNotes: 'dailyTypes.patterns.comboNotes',
  comboMiss: 'dailyTypes.patterns.comboMiss',
  comboGolden: 'dailyTypes.patterns.comboGolden',
  comboPerfect: 'dailyTypes.patterns.comboPerfect',
  perfectAcc: 'dailyTypes.patterns.perfectAcc',
  perfectGolden: 'dailyTypes.patterns.perfectGolden',
  perfectNotes: 'dailyTypes.patterns.perfectNotes',
  perfectMiss: 'dailyTypes.patterns.perfectMiss',
  perfectCombo: 'dailyTypes.patterns.perfectCombo',
  goldenAcc: 'dailyTypes.patterns.goldenAcc',
  goldenPerfect: 'dailyTypes.patterns.goldenPerfect',
  goldenMiss: 'dailyTypes.patterns.goldenMiss',
  goldenCombo: 'dailyTypes.patterns.goldenCombo',
  notesAcc: 'dailyTypes.patterns.notesAcc',
  notesCombo: 'dailyTypes.patterns.notesCombo',
  notesPerfect: 'dailyTypes.patterns.notesPerfect',
  notesGolden: 'dailyTypes.patterns.notesGolden',
  missNotes: 'dailyTypes.patterns.missNotes',
  missAcc: 'dailyTypes.patterns.missAcc',
  missCombo: 'dailyTypes.patterns.missCombo',
  tickNotes: 'dailyTypes.patterns.tickNotes',
  tickCombo: 'dailyTypes.patterns.tickCombo',
  tickGolden: 'dailyTypes.patterns.tickGolden',
  tickPerfect: 'dailyTypes.patterns.tickPerfect',
  comeback: 'dailyTypes.patterns.comeback',
};

const CAT_P = {
  genre: 'dailyTypes.patterns.genre',
  language: 'dailyTypes.patterns.language',
  atypical: 'dailyTypes.patterns.atypical',
  decade: 'dailyTypes.patterns.decade',
  yearBefore: 'dailyTypes.patterns.yearBefore',
  durationMin: 'dailyTypes.patterns.durationMin',
  durationMax: 'dailyTypes.patterns.durationMax',
  titleStartsRange: 'dailyTypes.patterns.titleStartsRange',
  titleContains: 'dailyTypes.patterns.titleContains',
  oneWordTitle: 'dailyTypes.patterns.oneWordTitle',
  titleHasDigit: 'dailyTypes.patterns.titleHasDigit',
  questionTitle: 'dailyTypes.patterns.questionTitle',
  featuredArtist: 'dailyTypes.patterns.featuredArtist',
  bandArtist: 'dailyTypes.patterns.bandArtist',
  bpmMin: 'dailyTypes.patterns.bpmMin',
  bpmMax: 'dailyTypes.patterns.bpmMax',
  freshSong: 'dailyTypes.patterns.freshSong',
  recentlyAdded: 'dailyTypes.patterns.recentlyAdded',
  songRating: 'dailyTypes.patterns.songRating',
  songDifficulty: 'dailyTypes.patterns.songDifficulty',
};

const NAME_P = {
  genre: 'dailyTypes.names.genreSong',
  language: 'dailyTypes.names.languageVerse',
  decade: 'dailyTypes.names.decadeDive',
};

/** compact performance-type builder */
function perf(
  id: string, icon: string, nameKey: string, descKey: string,
  metricKey: DailyMetricKey, targets: Record<DailyDifficulty, number>,
  opts?: { cap?: number; gates?: DailyGate[]; direction?: 'max' | 'min'; descriptionParams?: Record<string, string> },
): DailyTypeDefinition {
  const direction = opts?.direction ?? 'max';
  // Global difficulty easing: every target / gate / description param of the
  // DAILY pool is transformed here so display and evaluation stay in sync.
  const easedTargets = Object.fromEntries(
    (Object.keys(targets) as DailyDifficulty[]).map(d => [d, easeTarget(metricKey, direction, d, targets[d])]),
  ) as Record<DailyDifficulty, number>;
  const easedGates = easeGates(opts?.gates);
  return {
    id, icon, nameKey, descriptionKey: descKey, metricKey,
    direction,
    targets: easedTargets, cap: opts?.cap, gates: easedGates,
    descriptionParams: easeDescriptionParams(opts?.descriptionParams, opts?.gates),
  };
}

/** compact category-type builder (accuracy metric + category gate) */
function cat(
  id: string, icon: string, nameKey: string, descKey: string,
  category: DailyCategory,
  opts?: { nameParams?: Record<string, string>; descriptionParams?: Record<string, string>; targets?: Record<DailyDifficulty, number> },
): DailyTypeDefinition {
  return {
    id, icon, nameKey, descriptionKey: descKey,
    metricKey: 'accuracy', direction: 'max',
    targets: opts?.targets ?? CAT_ACC, cap: 99,
    gates: [], category,
    nameParams: opts?.nameParams,
    descriptionParams: opts?.descriptionParams,
  };
}

/** The 200 daily challenge variants. The first 22 keep their legacy ids/targets. */
export const DAILY_TYPE_LIST: readonly DailyTypeDefinition[] = [
  // ── Legacy performance types (1–22) ──
  perf('score', '🎵', 'dailyTypes.names.score', P.score, 'score', T(5500, 8000, 9500, 11000, 12500)),
  perf('accuracy', '🎯', 'dailyTypes.names.accuracy', P.accuracy, 'accuracy', T(75, 85, 90, 93, 96), { cap: 99 }),
  perf('combo', '⚡', 'dailyTypes.names.combo', P.combo, 'maxCombo', T(30, 50, 75, 100, 150)),
  perf('perfect_notes', '💎', 'dailyTypes.names.perfect_notes', P.perfect, 'perfectNotesCount', T(10, 20, 35, 50, 75)),
  perf('golden_notes', '✨', 'dailyTypes.names.golden_notes', P.golden, 'goldenNotesCount', T(4, 8, 12, 16, 22)),
  perf('notes_hit', '🎶', 'dailyTypes.names.notes_hit', P.notes, 'notesHit', T(80, 150, 250, 350, 500)),
  perf('tick_accuracy', '🎚️', 'dailyTypes.names.tick_accuracy', P.tick, 'tickAccuracy', T(70, 80, 86, 90, 94), { cap: 99 }),
  perf('clean_song', '🧼', 'dailyTypes.names.clean_song', P.missMax, 'notesMissed', T(25, 12, 7, 4, 2), { direction: 'min' }),
  perf('comeback', '🔄', 'dailyTypes.names.comeback', P.comeback, 'maxCombo', T(30, 40, 55, 70, 90), {
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 10 }], descriptionParams: { m: '10' },
  }),
  perf('sharpshooter', '🎺', 'dailyTypes.names.sharpshooter', P.accNotes, 'accuracy', T(82, 88, 91, 94, 97), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 60 }], descriptionParams: { m: '60' },
  }),
  perf('combo_master', '🔗', 'dailyTypes.names.combo_master', P.comboAcc, 'maxCombo', T(40, 60, 85, 110, 160), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 75 }], descriptionParams: { m: '75%' },
  }),
  perf('perfect_storm', '💫', 'dailyTypes.names.perfect_storm', P.perfectGolden, 'perfectNotesCount', T(12, 18, 28, 40, 60), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }], descriptionParams: { m: '5' },
  }),
  perf('endurance', '🏃', 'dailyTypes.names.endurance', P.notesCombo, 'notesHit', T(150, 250, 350, 450, 600), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 40 }], descriptionParams: { m: '40' },
  }),
  perf('golden_groove', '🌟', 'dailyTypes.names.golden_groove', P.goldenAcc, 'goldenNotesCount', T(6, 10, 14, 18, 24), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }], descriptionParams: { m: '85%' },
  }),
  perf('precision', '🎯', 'dailyTypes.names.precision', P.tickNotes, 'tickAccuracy', T(75, 85, 89, 92, 95), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 50 }], descriptionParams: { m: '50' },
  }),
  perf('flawless_finale', '🌈', 'dailyTypes.names.flawless_finale', P.accMiss, 'accuracy', T(85, 90, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'notesMissed', op: '<=', value: 8 }], descriptionParams: { m: '8' },
  }),
  perf('score_sniper', '🎸', 'dailyTypes.names.score_sniper', P.scoreAcc, 'score', T(6000, 8500, 10000, 11500, 13000), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }], descriptionParams: { m: '85%' },
  }),
  perf('combo_race', '🚀', 'dailyTypes.names.combo_race', P.comboNotes, 'maxCombo', T(50, 70, 95, 120, 170), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }], descriptionParams: { m: '100' },
  }),
  perf('perfect_pitch', '🎤', 'dailyTypes.names.perfect_pitch', P.perfectAcc, 'perfectNotesCount', T(10, 16, 25, 35, 50), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 90 }], descriptionParams: { m: '90%' },
  }),
  perf('golden_fingers', '🤌', 'dailyTypes.names.golden_fingers', P.goldenPerfect, 'goldenNotesCount', T(4, 6, 9, 12, 16), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 15 }], descriptionParams: { m: '15' },
  }),
  perf('steady_hand', '✋', 'dailyTypes.names.steady_hand', P.missNotes, 'notesMissed', T(15, 8, 5, 3, 1), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 80 }], descriptionParams: { m: '80' },
  }),
  perf('titan', '👑', 'dailyTypes.names.titan', P.scoreCombo, 'score', T(7000, 9000, 10500, 12000, 14000), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 60 }], descriptionParams: { m: '60' },
  }),

  // ── Score family (23–30) ──
  perf('score_sprout', '🌱', 'dailyTypes.names.score_sprout', P.score, 'score', T(4500, 6500, 8000, 9500, 11000)),
  perf('score_sprinter', '🏃', 'dailyTypes.names.score_sprinter', P.score, 'score', T(6000, 8500, 10000, 11500, 13000)),
  perf('score_slayer', '⚔️', 'dailyTypes.names.score_slayer', P.score, 'score', T(7500, 9500, 11000, 12500, 14000)),
  perf('score_phantom', '👻', 'dailyTypes.names.score_phantom', P.scoreMiss, 'score', T(6500, 9000, 10500, 12000, 13500), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 15 }], descriptionParams: { m: '15' },
  }),
  perf('score_boulder', '🪨', 'dailyTypes.names.score_boulder', P.scoreCombo, 'score', T(7000, 9000, 10500, 12000, 14000), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 50 }], descriptionParams: { m: '50' },
  }),
  perf('score_eclipse', '🌑', 'dailyTypes.names.score_eclipse', P.scoreAcc, 'score', T(8000, 10000, 11500, 13000, 14500), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 88 }], descriptionParams: { m: '88%' },
  }),
  perf('score_comet', '☄️', 'dailyTypes.names.score_comet', P.scoreAcc, 'score', T(7250, 9250, 10750, 12250, 13750), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 25 }], descriptionParams: { m: '25' },
  }),
  perf('score_volcano', '🌋', 'dailyTypes.names.score_volcano', P.scoreAcc, 'score', T(8500, 10500, 12000, 13500, 15000), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 6 }], descriptionParams: { m: '6' },
  }),

  // ── Accuracy family (31–37) ──
  perf('accuracy_adept', '🎯', 'dailyTypes.names.accuracy_adept', P.accuracy, 'accuracy', T(78, 86, 90, 93, 96), { cap: 99 }),
  perf('accuracy_artisan', '🎨', 'dailyTypes.names.accuracy_artisan', P.accuracy, 'accuracy', T(80, 88, 91, 94, 97), { cap: 99 }),
  perf('accuracy_archer', '🏹', 'dailyTypes.names.accuracy_archer', P.accNotes, 'accuracy', T(84, 90, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 70 }], descriptionParams: { m: '70' },
  }),
  perf('accuracy_navigator', '🧭', 'dailyTypes.names.accuracy_navigator', P.accCombo, 'accuracy', T(76, 84, 88, 91, 94), {
    cap: 99, gates: [{ metricKey: 'maxCombo', op: '>=', value: 35 }], descriptionParams: { m: '35' },
  }),
  perf('accuracy_horizon', '🌅', 'dailyTypes.names.accuracy_horizon', P.accGolden, 'accuracy', T(82, 89, 92, 95, 97), {
    cap: 99, gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 4 }], descriptionParams: { m: '4' },
  }),
  perf('accuracy_zenith', '🌠', 'dailyTypes.names.accuracy_zenith', P.accMiss, 'accuracy', T(86, 91, 93, 95, 98), {
    cap: 99, gates: [{ metricKey: 'notesMissed', op: '<=', value: 10 }], descriptionParams: { m: '10' },
  }),
  perf('accuracy_mirage', '🏜️', 'dailyTypes.names.accuracy_mirage', P.accPerfect, 'accuracy', T(79, 87, 90, 93, 96), {
    cap: 99, gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 20 }], descriptionParams: { m: '20' },
  }),

  // ── Combo family (38–44) ──
  perf('combo_spark', '⚡', 'dailyTypes.names.combo_spark', P.combo, 'maxCombo', T(35, 55, 80, 105, 155)),
  perf('combo_forge', '🔥', 'dailyTypes.names.combo_forge', P.comboAcc, 'maxCombo', T(45, 65, 90, 115, 165), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 72 }], descriptionParams: { m: '72%' },
  }),
  perf('combo_tornado', '🌪️', 'dailyTypes.names.combo_tornado', P.comboNotes, 'maxCombo', T(55, 75, 100, 125, 175), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 120 }], descriptionParams: { m: '120' },
  }),
  perf('combo_glacier', '🧊', 'dailyTypes.names.combo_glacier', P.comboMiss, 'maxCombo', T(40, 60, 85, 110, 160), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 12 }], descriptionParams: { m: '12' },
  }),
  perf('combo_phoenix', '🕊️', 'dailyTypes.names.combo_phoenix', P.comeback, 'maxCombo', T(35, 50, 70, 90, 120), {
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 20 }], descriptionParams: { m: '20' },
  }),
  perf('combo_avalanche', '🏔️', 'dailyTypes.names.combo_avalanche', P.comboGolden, 'maxCombo', T(60, 80, 105, 130, 180), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }], descriptionParams: { m: '5' },
  }),
  perf('combo_tsunami', '🌊', 'dailyTypes.names.combo_tsunami', P.comboPerfect, 'maxCombo', T(50, 72, 98, 124, 172), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 30 }], descriptionParams: { m: '30' },
  }),

  // ── Perfect family (45–50) ──
  perf('perfect_dawn', '🌅', 'dailyTypes.names.perfect_dawn', P.perfect, 'perfectNotesCount', T(8, 14, 22, 32, 48)),
  perf('perfect_bloom', '🌸', 'dailyTypes.names.perfect_bloom', P.perfectAcc, 'perfectNotesCount', T(12, 20, 30, 42, 58), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 78 }], descriptionParams: { m: '78%' },
  }),
  perf('perfect_cascade', '💧', 'dailyTypes.names.perfect_cascade', P.perfectGolden, 'perfectNotesCount', T(15, 24, 36, 50, 70), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '3' },
  }),
  perf('perfect_summit', '⛰️', 'dailyTypes.names.perfect_summit', P.perfectCombo, 'perfectNotesCount', T(18, 28, 40, 55, 75), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 45 }], descriptionParams: { m: '45' },
  }),
  perf('perfect_galaxy', '🌌', 'dailyTypes.names.perfect_galaxy', P.perfectMiss, 'perfectNotesCount', T(20, 32, 45, 62, 85), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 15 }], descriptionParams: { m: '15' },
  }),
  perf('perfect_aurora', '🌠', 'dailyTypes.names.perfect_aurora', P.perfectNotes, 'perfectNotesCount', T(14, 22, 33, 46, 66), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }], descriptionParams: { m: '100' },
  }),

  // ── Golden family (51–55) ──
  perf('golden_spark', '✨', 'dailyTypes.names.golden_spark', P.golden, 'goldenNotesCount', T(3, 6, 9, 12, 18)),
  perf('golden_rush', '💰', 'dailyTypes.names.golden_rush', P.goldenAcc, 'goldenNotesCount', T(5, 9, 13, 17, 23), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 80 }], descriptionParams: { m: '80%' },
  }),
  perf('golden_treasure', '🗝️', 'dailyTypes.names.golden_treasure', P.goldenPerfect, 'goldenNotesCount', T(6, 10, 14, 19, 25), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 18 }], descriptionParams: { m: '18' },
  }),
  perf('golden_eclipse', '🌘', 'dailyTypes.names.golden_eclipse', P.goldenCombo, 'goldenNotesCount', T(4, 8, 12, 16, 22), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 40 }], descriptionParams: { m: '40' },
  }),
  perf('golden_legend', '🏆', 'dailyTypes.names.golden_legend', P.goldenMiss, 'goldenNotesCount', T(8, 12, 17, 23, 30), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 10 }], descriptionParams: { m: '10' },
  }),

  // ── Notes family (56–60) ──
  perf('notes_river', '🏞️', 'dailyTypes.names.notes_river', P.notes, 'notesHit', T(100, 180, 300, 420, 600)),
  perf('notes_storm', '⛈️', 'dailyTypes.names.notes_storm', P.notesAcc, 'notesHit', T(130, 220, 350, 480, 660), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 75 }], descriptionParams: { m: '75%' },
  }),
  perf('notes_mountain', '🗻', 'dailyTypes.names.notes_mountain', P.notesCombo, 'notesHit', T(120, 200, 320, 450, 640), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 50 }], descriptionParams: { m: '50' },
  }),
  perf('notes_odyssey', '🚢', 'dailyTypes.names.notes_odyssey', P.notesPerfect, 'notesHit', T(150, 250, 380, 520, 700), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 20 }], descriptionParams: { m: '20' },
  }),
  perf('notes_horizon', '🛤️', 'dailyTypes.names.notes_horizon', P.notes, 'notesHit', T(90, 160, 270, 380, 550)),

  // ── Miss family (61–65) ──
  perf('miss_guard', '🛡️', 'dailyTypes.names.miss_guard', P.missNotes, 'notesMissed', T(20, 10, 6, 3, 1), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 60 }], descriptionParams: { m: '60' },
  }),
  perf('miss_anchor', '⚓', 'dailyTypes.names.miss_anchor', P.missCombo, 'notesMissed', T(25, 14, 8, 4, 2), {
    direction: 'min', gates: [{ metricKey: 'maxCombo', op: '>=', value: 30 }], descriptionParams: { m: '30' },
  }),
  perf('miss_diamond', '💎', 'dailyTypes.names.miss_diamond', P.missAcc, 'notesMissed', T(18, 9, 5, 2, 1), {
    direction: 'min', gates: [{ metricKey: 'accuracy', op: '>=', value: 80 }], descriptionParams: { m: '80%' },
  }),
  perf('miss_bubble', '🫧', 'dailyTypes.names.miss_bubble', P.missNotes, 'notesMissed', T(30, 16, 9, 5, 2), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 90 }], descriptionParams: { m: '90' },
  }),
  perf('miss_zero', '🚫', 'dailyTypes.names.miss_zero', P.missMax, 'notesMissed', T(12, 6, 3, 1, 0), { direction: 'min' }),

  // ── Tick family (66–69) ──
  perf('tick_harmony', '🎚️', 'dailyTypes.names.tick_harmony', P.tick, 'tickAccuracy', T(72, 82, 87, 91, 95), { cap: 99 }),
  perf('tick_metro', '🕰️', 'dailyTypes.names.tick_metro', P.tickNotes, 'tickAccuracy', T(75, 85, 89, 92, 95), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 60 }], descriptionParams: { m: '60' },
  }),
  perf('tick_quartz', '💠', 'dailyTypes.names.tick_quartz', P.tickPerfect, 'tickAccuracy', T(70, 80, 86, 90, 94), {
    cap: 99, gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 12 }], descriptionParams: { m: '12' },
  }),
  perf('tick_symphony', '🎼', 'dailyTypes.names.tick_symphony', P.tickGolden, 'tickAccuracy', T(78, 87, 91, 93, 96), {
    cap: 99, gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '3' },
  }),

  // ── Genre challenges (70–93) ──
  cat('genre_pop', '🎤', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Pop' }, { nameParams: { genre: 'Pop' }, descriptionParams: { genre: 'Pop' } }),
  cat('genre_rock', '🎸', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Rock' }, { nameParams: { genre: 'Rock' }, descriptionParams: { genre: 'Rock' } }),
  cat('genre_metal', '🤘', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Metal' }, { nameParams: { genre: 'Metal' }, descriptionParams: { genre: 'Metal' } }),
  cat('genre_punk', '🧷', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Punk' }, { nameParams: { genre: 'Punk' }, descriptionParams: { genre: 'Punk' } }),
  cat('genre_rap', '🎧', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Rap' }, { nameParams: { genre: 'Rap' }, descriptionParams: { genre: 'Rap' } }),
  cat('genre_rnb', '🎶', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'R&B' }, { nameParams: { genre: 'R&B' }, descriptionParams: { genre: 'R&B' } }),
  cat('genre_soul', '❤️', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Soul' }, { nameParams: { genre: 'Soul' }, descriptionParams: { genre: 'Soul' } }),
  cat('genre_funk', '🕺', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Funk' }, { nameParams: { genre: 'Funk' }, descriptionParams: { genre: 'Funk' } }),
  cat('duo_day', '👫', 'dailyTypes.names.duo_day', 'dailyTypes.patterns.duo_day', { field: 'coopPartner' }),
  cat('genre_blues', '🎷', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Blues' }, { nameParams: { genre: 'Blues' }, descriptionParams: { genre: 'Blues' } }),
  cat('genre_folk', '🪕', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Folk' }, { nameParams: { genre: 'Folk' }, descriptionParams: { genre: 'Folk' } }),
  cat('genre_country', '🤠', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Country' }, { nameParams: { genre: 'Country' }, descriptionParams: { genre: 'Country' } }),
  cat('genre_electronic', '🎛️', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Electronic' }, { nameParams: { genre: 'Electronic' }, descriptionParams: { genre: 'Electronic' } }),
  cat('genre_reggae', '🌴', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Reggae' }, { nameParams: { genre: 'Reggae' }, descriptionParams: { genre: 'Reggae' } }),
  cat('genre_latin', '💃', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Latin' }, { nameParams: { genre: 'Latin' }, descriptionParams: { genre: 'Latin' } }),
  cat('genre_classical', '🎻', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Classical' }, { nameParams: { genre: 'Classical' }, descriptionParams: { genre: 'Classical' } }),
  cat('genre_schlager', '🎊', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Schlager' }, { nameParams: { genre: 'Schlager' }, descriptionParams: { genre: 'Schlager' } }),
  cat('genre_volksmusik', '🏔️', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Volksmusik' }, { nameParams: { genre: 'Volksmusik' }, descriptionParams: { genre: 'Volksmusik' } }),
  cat('genre_musical', '🎭', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Musical' }, { nameParams: { genre: 'Musical' }, descriptionParams: { genre: 'Musical' } }),
  cat('genre_soundtrack', '🎬', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Soundtrack' }, { nameParams: { genre: 'Soundtrack' }, descriptionParams: { genre: 'Soundtrack' } }),
  cat('genre_disney', '🏰', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'Disney' }, { nameParams: { genre: 'Disney' }, descriptionParams: { genre: 'Disney' } }),
  cat('genre_childrens', '🧸', NAME_P.genre, CAT_P.genre, { field: 'genre', value: "Children's" }, { nameParams: { genre: "Children's" }, descriptionParams: { genre: "Children's" } }),
  cat('genre_kpop', '💖', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'K-Pop' }, { nameParams: { genre: 'K-Pop' }, descriptionParams: { genre: 'K-Pop' } }),
  cat('genre_jpop', '🌸', NAME_P.genre, CAT_P.genre, { field: 'genre', value: 'J-Pop' }, { nameParams: { genre: 'J-Pop' }, descriptionParams: { genre: 'J-Pop' } }),

  // ── Language challenges (94–116) ──
  cat('lang_english', '🇬🇧', NAME_P.language, CAT_P.language, { field: 'language', value: 'English' }, { nameParams: { language: 'English' }, descriptionParams: { language: 'English' } }),
  cat('lang_german', '🇩🇪', NAME_P.language, CAT_P.language, { field: 'language', value: 'German' }, { nameParams: { language: 'German' }, descriptionParams: { language: 'German' } }),
  cat('lang_spanish', '🇪🇸', NAME_P.language, CAT_P.language, { field: 'language', value: 'Spanish' }, { nameParams: { language: 'Spanish' }, descriptionParams: { language: 'Spanish' } }),
  cat('lang_french', '🇫🇷', NAME_P.language, CAT_P.language, { field: 'language', value: 'French' }, { nameParams: { language: 'French' }, descriptionParams: { language: 'French' } }),
  cat('lang_italian', '🇮🇹', NAME_P.language, CAT_P.language, { field: 'language', value: 'Italian' }, { nameParams: { language: 'Italian' }, descriptionParams: { language: 'Italian' } }),
  cat('lang_portuguese', '🇵🇹', NAME_P.language, CAT_P.language, { field: 'language', value: 'Portuguese' }, { nameParams: { language: 'Portuguese' }, descriptionParams: { language: 'Portuguese' } }),
  cat('lang_japanese', '🇯🇵', NAME_P.language, CAT_P.language, { field: 'language', value: 'Japanese' }, { nameParams: { language: 'Japanese' }, descriptionParams: { language: 'Japanese' } }),
  cat('lang_korean', '🇰🇷', NAME_P.language, CAT_P.language, { field: 'language', value: 'Korean' }, { nameParams: { language: 'Korean' }, descriptionParams: { language: 'Korean' } }),
  cat('lang_chinese', '🇨🇳', NAME_P.language, CAT_P.language, { field: 'language', value: 'Chinese' }, { nameParams: { language: 'Chinese' }, descriptionParams: { language: 'Chinese' } }),
  cat('lang_russian', '🇷🇺', NAME_P.language, CAT_P.language, { field: 'language', value: 'Russian' }, { nameParams: { language: 'Russian' }, descriptionParams: { language: 'Russian' } }),
  cat('lang_dutch', '🇳🇱', NAME_P.language, CAT_P.language, { field: 'language', value: 'Dutch' }, { nameParams: { language: 'Dutch' }, descriptionParams: { language: 'Dutch' } }),
  cat('lang_polish', '🇵🇱', NAME_P.language, CAT_P.language, { field: 'language', value: 'Polish' }, { nameParams: { language: 'Polish' }, descriptionParams: { language: 'Polish' } }),
  cat('lang_turkish', '🇹🇷', NAME_P.language, CAT_P.language, { field: 'language', value: 'Turkish' }, { nameParams: { language: 'Turkish' }, descriptionParams: { language: 'Turkish' } }),
  cat('lang_arabic', '🕌', NAME_P.language, CAT_P.language, { field: 'language', value: 'Arabic' }, { nameParams: { language: 'Arabic' }, descriptionParams: { language: 'Arabic' } }),
  cat('lang_swedish', '🇸🇪', NAME_P.language, CAT_P.language, { field: 'language', value: 'Swedish' }, { nameParams: { language: 'Swedish' }, descriptionParams: { language: 'Swedish' } }),
  cat('lang_latin', '🏛️', NAME_P.language, CAT_P.language, { field: 'language', value: 'Latin' }, { nameParams: { language: 'Latin' }, descriptionParams: { language: 'Latin' } }),
  cat('lang_norwegian', '🇳🇴', NAME_P.language, CAT_P.language, { field: 'language', value: 'Norwegian' }, { nameParams: { language: 'Norwegian' }, descriptionParams: { language: 'Norwegian' } }),
  cat('lang_danish', '🇩🇰', NAME_P.language, CAT_P.language, { field: 'language', value: 'Danish' }, { nameParams: { language: 'Danish' }, descriptionParams: { language: 'Danish' } }),
  cat('lang_finnish', '🇫🇮', NAME_P.language, CAT_P.language, { field: 'language', value: 'Finnish' }, { nameParams: { language: 'Finnish' }, descriptionParams: { language: 'Finnish' } }),
  cat('lang_hindi', '🇮🇳', NAME_P.language, CAT_P.language, { field: 'language', value: 'Hindi' }, { nameParams: { language: 'Hindi' }, descriptionParams: { language: 'Hindi' } }),
  cat('lang_thai', '🇹🇭', NAME_P.language, CAT_P.language, { field: 'language', value: 'Thai' }, { nameParams: { language: 'Thai' }, descriptionParams: { language: 'Thai' } }),
  cat('lang_indonesian', '🇮🇩', NAME_P.language, CAT_P.language, { field: 'language', value: 'Indonesian' }, { nameParams: { language: 'Indonesian' }, descriptionParams: { language: 'Indonesian' } }),
  cat('lang_atypical', '🌍', 'dailyTypes.names.globetrotter', CAT_P.atypical, { field: 'atypicalLanguage' }),

  // ── Decade challenges (117–125) ──
  cat('decade_1950', '💽', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 1950 }, { nameParams: { decade: '1950' }, descriptionParams: { decade: '1950' } }),
  cat('decade_1960', '📻', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 1960 }, { nameParams: { decade: '1960' }, descriptionParams: { decade: '1960' } }),
  cat('decade_1970', '🪩', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 1970 }, { nameParams: { decade: '1970' }, descriptionParams: { decade: '1970' } }),
  cat('decade_1980', '📼', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 1980 }, { nameParams: { decade: '1980' }, descriptionParams: { decade: '1980' } }),
  cat('decade_1990', '💿', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 1990 }, { nameParams: { decade: '1990' }, descriptionParams: { decade: '1990' } }),
  cat('decade_2000', '📱', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 2000 }, { nameParams: { decade: '2000' }, descriptionParams: { decade: '2000' } }),
  cat('decade_2010', '📸', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 2010 }, { nameParams: { decade: '2010' }, descriptionParams: { decade: '2010' } }),
  cat('decade_2020', '🚀', NAME_P.decade, CAT_P.decade, { field: 'decade', value: 2020 }, { nameParams: { decade: '2020' }, descriptionParams: { decade: '2020' } }),
  cat('decade_vintage', '🎞️', 'dailyTypes.names.vintage', CAT_P.yearBefore, { field: 'yearBefore', value: 1960 }, { descriptionParams: { year: '1960' } }),

  // ── Song-shape challenges (126–143) ──
  cat('shape_longballad', '⏳', 'dailyTypes.names.shape_longballad', CAT_P.durationMin, { field: 'durationMinMinutes', value: 4 }, { descriptionParams: { duration: '4' } }),
  cat('shape_epic', '💫', 'dailyTypes.names.shape_epic', CAT_P.durationMin, { field: 'durationMinMinutes', value: 5 }, { descriptionParams: { duration: '5' } }),
  cat('shape_quickie', '⏱️', 'dailyTypes.names.shape_quickie', CAT_P.durationMax, { field: 'durationMaxMinutes', value: 3 }, { descriptionParams: { duration: '3' } }),
  cat('shape_sprint', '🏁', 'dailyTypes.names.shape_sprint', CAT_P.durationMax, { field: 'durationMaxMinutes', value: 2.5 }, { descriptionParams: { duration: '2.5' } }),
  cat('shape_title_am', '🔡', 'dailyTypes.names.shape_title_am', CAT_P.titleStartsRange, { field: 'titleStartsRange', value: 'A-M' }, { descriptionParams: { range: 'A–M' } }),
  cat('shape_title_nz', '🔠', 'dailyTypes.names.shape_title_nz', CAT_P.titleStartsRange, { field: 'titleStartsRange', value: 'N-Z' }, { descriptionParams: { range: 'N–Z' } }),
  cat('shape_oneword', '💬', 'dailyTypes.names.shape_oneword', CAT_P.oneWordTitle, { field: 'oneWordTitle' }),
  cat('shape_love_title', '💗', 'dailyTypes.names.shape_love_title', CAT_P.titleContains, { field: 'titleContains', value: 'love' }, { descriptionParams: { word: 'love' } }),
  cat('shape_number_title', '🔢', 'dailyTypes.names.shape_number_title', CAT_P.titleHasDigit, { field: 'titleHasDigit' }),
  cat('shape_question', '❓', 'dailyTypes.names.shape_question', CAT_P.questionTitle, { field: 'questionTitle' }),
  cat('shape_feat', '🤝', 'dailyTypes.names.shape_feat', CAT_P.featuredArtist, { field: 'featuredArtist' }),
  cat('shape_band', '👥', 'dailyTypes.names.shape_band', CAT_P.bandArtist, { field: 'bandArtist' }),
  cat('shape_bpm_fast', '🥁', 'dailyTypes.names.shape_bpm_fast', CAT_P.bpmMin, { field: 'bpmMin', value: 140 }, { descriptionParams: { bpm: '140' } }),
  cat('shape_bpm_slow', '🐢', 'dailyTypes.names.shape_bpm_slow', CAT_P.bpmMax, { field: 'bpmMax', value: 90 }, { descriptionParams: { bpm: '90' } }),
  cat('shape_fresh', '🆕', 'dailyTypes.names.shape_fresh', CAT_P.freshSong, { field: 'freshSong' }),
  cat('shape_recent', '📅', 'dailyTypes.names.shape_recent', CAT_P.recentlyAdded, { field: 'recentlyAdded' }),
  cat('shape_rating5', '⭐', 'dailyTypes.names.shape_rating5', CAT_P.songRating, { field: 'songRating', value: 5 }, { descriptionParams: { rating: '5' } }),
  cat('shape_diff_easy', '🍃', 'dailyTypes.names.shape_diff_easy', CAT_P.songDifficulty, { field: 'songDifficulty', value: 'easy' }, { descriptionParams: { difficulty: 'easy' } }),
  cat('shape_diff_hard', '🌶️', 'dailyTypes.names.shape_diff_hard', CAT_P.songDifficulty, { field: 'songDifficulty', value: 'hard' }, { descriptionParams: { difficulty: 'hard' } }),

  // ── Maestro double-gate combos (144–153) ──
  perf('maestro_score', '🎩', 'dailyTypes.names.maestro_score', P.scoreAcc, 'score', T(7800, 9800, 11300, 12800, 14300), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }, { metricKey: 'maxCombo', op: '>=', value: 50 }], descriptionParams: { m: '85%' },
  }),
  perf('maestro_accuracy', '🎯', 'dailyTypes.names.maestro_accuracy', P.accMiss, 'accuracy', T(83, 89, 92, 94, 97), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 80 }, { metricKey: 'notesMissed', op: '<=', value: 12 }], descriptionParams: { m: '12' },
  }),
  perf('maestro_combo', '🔗', 'dailyTypes.names.maestro_combo', P.comboAcc, 'maxCombo', T(48, 68, 93, 118, 168), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 80 }, { metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '80%' },
  }),
  perf('maestro_perfect', '💎', 'dailyTypes.names.maestro_perfect', P.perfectAcc, 'perfectNotesCount', T(16, 26, 38, 52, 72), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }, { metricKey: 'maxCombo', op: '>=', value: 40 }], descriptionParams: { m: '85%' },
  }),
  perf('maestro_golden', '✨', 'dailyTypes.names.maestro_golden', P.goldenAcc, 'goldenNotesCount', T(5, 8, 12, 16, 22), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }, { metricKey: 'perfectNotesCount', op: '>=', value: 20 }], descriptionParams: { m: '85%' },
  }),
  perf('virtuoso_score', '🌟', 'dailyTypes.names.virtuoso_score', P.scoreMiss, 'score', T(8200, 10200, 11700, 13200, 14700), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 25 }, { metricKey: 'notesMissed', op: '<=', value: 10 }], descriptionParams: { m: '10' },
  }),
  perf('virtuoso_accuracy', '🌠', 'dailyTypes.names.virtuoso_accuracy', P.accGolden, 'accuracy', T(85, 90, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'maxCombo', op: '>=', value: 60 }, { metricKey: 'goldenNotesCount', op: '>=', value: 4 }], descriptionParams: { m: '4' },
  }),
  perf('virtuoso_combo', '🚀', 'dailyTypes.names.virtuoso_combo', P.comboNotes, 'maxCombo', T(52, 74, 100, 126, 176), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 150 }, { metricKey: 'notesMissed', op: '<=', value: 10 }], descriptionParams: { m: '150' },
  }),
  perf('virtuoso_perfect', '💫', 'dailyTypes.names.virtuoso_perfect', P.perfectGolden, 'perfectNotesCount', T(19, 30, 43, 58, 80), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }, { metricKey: 'notesHit', op: '>=', value: 120 }], descriptionParams: { m: '5' },
  }),
  perf('virtuoso_golden', '🏅', 'dailyTypes.names.virtuoso_golden', P.goldenPerfect, 'goldenNotesCount', T(6, 10, 15, 20, 27), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 25 }, { metricKey: 'maxCombo', op: '>=', value: 50 }], descriptionParams: { m: '25' },
  }),

  // ── Titan / ghost / phoenix / storm / prism (154–168) ──
  perf('titan_notes', '🗿', 'dailyTypes.names.titan_notes', P.notesAcc, 'notesHit', T(160, 260, 400, 540, 720), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 80 }, { metricKey: 'maxCombo', op: '>=', value: 60 }], descriptionParams: { m: '80%' },
  }),
  perf('titan_tick', '🕰️', 'dailyTypes.names.titan_tick', P.tickNotes, 'tickAccuracy', T(77, 86, 90, 93, 96), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }, { metricKey: 'notesMissed', op: '<=', value: 12 }], descriptionParams: { m: '100' },
  }),
  perf('ghost_miss', '👻', 'dailyTypes.names.ghost_miss', P.missAcc, 'notesMissed', T(22, 12, 7, 4, 2), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }, { metricKey: 'accuracy', op: '>=', value: 75 }], descriptionParams: { m: '75%' },
  }),
  perf('ghost_score', '👤', 'dailyTypes.names.ghost_score', P.scoreMiss, 'score', T(6800, 8800, 10300, 11800, 13300), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 10 }, { metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '10' },
  }),
  perf('ghost_combo', '💨', 'dailyTypes.names.ghost_combo', P.comboMiss, 'maxCombo', T(44, 64, 89, 114, 164), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 8 }, { metricKey: 'accuracy', op: '>=', value: 78 }], descriptionParams: { m: '8' },
  }),
  perf('phoenix_accuracy', '🔥', 'dailyTypes.names.phoenix_accuracy', P.accNotes, 'accuracy', T(81, 88, 91, 93, 96), {
    cap: 99, gates: [{ metricKey: 'notesMissed', op: '>=', value: 8 }, { metricKey: 'notesHit', op: '>=', value: 70 }], descriptionParams: { m: '70' },
  }),
  perf('phoenix_score', '🌋', 'dailyTypes.names.phoenix_score', P.scoreAcc, 'score', T(7200, 9200, 10700, 12200, 13700), {
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 12 }], descriptionParams: { m: '90%' },
  }),
  perf('phoenix_perfect', '🦅', 'dailyTypes.names.phoenix_perfect', P.perfectNotes, 'perfectNotesCount', T(13, 22, 32, 45, 64), {
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 10 }, { metricKey: 'notesHit', op: '>=', value: 100 }], descriptionParams: { m: '100' },
  }),
  perf('storm_notes', '⛈️', 'dailyTypes.names.storm_notes', P.notesGolden, 'notesHit', T(140, 240, 370, 510, 690), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 4 }, { metricKey: 'perfectNotesCount', op: '>=', value: 18 }], descriptionParams: { m: '4' },
  }),
  perf('storm_tick', '⚡', 'dailyTypes.names.storm_tick', P.tickCombo, 'tickAccuracy', T(74, 84, 88, 91, 95), {
    cap: 99, gates: [{ metricKey: 'maxCombo', op: '>=', value: 45 }, { metricKey: 'notesHit', op: '>=', value: 110 }], descriptionParams: { m: '45' },
  }),
  perf('storm_score', '🌩️', 'dailyTypes.names.storm_score', P.scoreAcc, 'score', T(7400, 9400, 10900, 12400, 13900), {
    gates: [{ metricKey: 'tickAccuracy', op: '>=', value: 80 }], descriptionParams: { m: '80%' },
  }),
  perf('prism_accuracy', '🔮', 'dailyTypes.names.prism_accuracy', P.accPerfect, 'accuracy', T(82, 89, 92, 94, 96), {
    cap: 99, gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 22 }, { metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '22' },
  }),
  perf('prism_combo', '🔮', 'dailyTypes.names.prism_combo', P.comboPerfect, 'maxCombo', T(46, 66, 91, 116, 166), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 15 }, { metricKey: 'notesMissed', op: '<=', value: 14 }], descriptionParams: { m: '15' },
  }),
  perf('prism_score', '💠', 'dailyTypes.names.prism_score', P.scoreAcc, 'score', T(7000, 9000, 10500, 12000, 13500), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 130 }, { metricKey: 'maxCombo', op: '>=', value: 40 }], descriptionParams: { m: '85%' },
  }),

  // ── Apex tier (169–176) ──
  perf('apex_score', '👑', 'dailyTypes.names.apex_score', P.score, 'score', T(9000, 11000, 12500, 14000, 15500)),
  perf('apex_accuracy', '👑', 'dailyTypes.names.apex_accuracy', P.accuracy, 'accuracy', T(88, 92, 94, 96, 98), { cap: 99 }),
  perf('apex_combo', '👑', 'dailyTypes.names.apex_combo', P.combo, 'maxCombo', T(65, 88, 112, 138, 188)),
  perf('apex_perfect', '👑', 'dailyTypes.names.apex_perfect', P.perfect, 'perfectNotesCount', T(24, 36, 50, 68, 92)),
  perf('apex_golden', '👑', 'dailyTypes.names.apex_golden', P.golden, 'goldenNotesCount', T(9, 14, 19, 25, 33)),
  perf('apex_notes', '👑', 'dailyTypes.names.apex_notes', P.notes, 'notesHit', T(180, 280, 430, 580, 760)),
  perf('apex_tick', '👑', 'dailyTypes.names.apex_tick', P.tick, 'tickAccuracy', T(80, 89, 92, 94, 97), { cap: 99 }),
  perf('apex_clean', '👑', 'dailyTypes.names.apex_clean', P.missNotes, 'notesMissed', T(10, 5, 3, 2, 1), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 120 }], descriptionParams: { m: '120' },
  }),

  // ── Nova tier (177–180) ──
  perf('nova_score', '💫', 'dailyTypes.names.nova_score', P.scoreAcc, 'score', T(8600, 10600, 12100, 13600, 15100), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 90 }], descriptionParams: { m: '90%' },
  }),
  perf('nova_combo', '💫', 'dailyTypes.names.nova_combo', P.comboAcc, 'maxCombo', T(58, 80, 105, 132, 182), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 88 }], descriptionParams: { m: '88%' },
  }),
  perf('nova_perfect', '💫', 'dailyTypes.names.nova_perfect', P.perfectGolden, 'perfectNotesCount', T(22, 34, 47, 64, 88), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 6 }], descriptionParams: { m: '6' },
  }),
  perf('nova_golden', '💫', 'dailyTypes.names.nova_golden', P.goldenMiss, 'goldenNotesCount', T(7, 11, 16, 21, 29), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 8 }], descriptionParams: { m: '8' },
  }),

  // ── Echo tier (181–184) ──
  perf('echo_score', '📢', 'dailyTypes.names.echo_score', P.scoreAcc, 'score', T(6600, 8600, 10100, 11600, 13100), {
    gates: [{ metricKey: 'tickAccuracy', op: '>=', value: 78 }], descriptionParams: { m: '78%' },
  }),
  perf('echo_combo', '📢', 'dailyTypes.names.echo_combo', P.comboGolden, 'maxCombo', T(42, 62, 87, 112, 162), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '3' },
  }),
  perf('echo_perfect', '📢', 'dailyTypes.names.echo_perfect', P.perfectNotes, 'perfectNotesCount', T(11, 19, 29, 41, 60), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 90 }], descriptionParams: { m: '90' },
  }),
  perf('echo_golden', '📢', 'dailyTypes.names.echo_golden', P.goldenCombo, 'goldenNotesCount', T(4, 7, 10, 14, 20), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 35 }], descriptionParams: { m: '35' },
  }),

  // ── Drift tier (185–188) ──
  perf('drift_accuracy', '🍂', 'dailyTypes.names.drift_accuracy', P.accNotes, 'accuracy', T(77, 85, 89, 92, 95), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 140 }], descriptionParams: { m: '140' },
  }),
  perf('drift_combo', '🍂', 'dailyTypes.names.drift_combo', P.comboPerfect, 'maxCombo', T(38, 58, 83, 108, 158), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 14 }], descriptionParams: { m: '14' },
  }),
  perf('drift_score', '🍂', 'dailyTypes.names.drift_score', P.scoreAcc, 'score', T(6900, 8900, 10400, 11900, 13400), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 18 }], descriptionParams: { m: '85%' },
  }),
  perf('drift_notes', '🍂', 'dailyTypes.names.drift_notes', P.notesGolden, 'notesHit', T(110, 190, 310, 430, 610), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 3 }], descriptionParams: { m: '3' },
  }),

  // ── Pulse tier (189–192) ──
  perf('pulse_tick', '💓', 'dailyTypes.names.pulse_tick', P.tickGolden, 'tickAccuracy', T(73, 83, 88, 91, 94), {
    cap: 99, gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 4 }], descriptionParams: { m: '4' },
  }),
  perf('pulse_score', '💓', 'dailyTypes.names.pulse_score', P.scoreMiss, 'score', T(7100, 9100, 10600, 12100, 13600), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 14 }], descriptionParams: { m: '14' },
  }),
  perf('pulse_perfect', '💓', 'dailyTypes.names.pulse_perfect', P.perfectNotes, 'perfectNotesCount', T(15, 25, 36, 50, 72), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 130 }], descriptionParams: { m: '130' },
  }),
  perf('pulse_combo', '💓', 'dailyTypes.names.pulse_combo', P.comboMiss, 'maxCombo', T(47, 69, 95, 121, 171), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 12 }], descriptionParams: { m: '12' },
  }),

  // ── Lunar tier (193–196) ──
  perf('lunar_accuracy', '🌙', 'dailyTypes.names.lunar_accuracy', P.accMiss, 'accuracy', T(84, 90, 92, 94, 96), {
    cap: 99, gates: [{ metricKey: 'notesMissed', op: '<=', value: 14 }], descriptionParams: { m: '14' },
  }),
  perf('lunar_score', '🌙', 'dailyTypes.names.lunar_score', P.scoreCombo, 'score', T(7300, 9300, 10800, 12300, 13800), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 55 }], descriptionParams: { m: '55' },
  }),
  perf('lunar_perfect', '🌙', 'dailyTypes.names.lunar_perfect', P.perfectNotes, 'perfectNotesCount', T(17, 27, 39, 54, 76), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 110 }], descriptionParams: { m: '110' },
  }),
  perf('lunar_golden', '🌙', 'dailyTypes.names.lunar_golden', P.goldenAcc, 'goldenNotesCount', T(5, 9, 13, 18, 24), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 82 }], descriptionParams: { m: '82%' },
  }),

  // ── Solar tier (197–200) ──
  perf('solar_notes', '☀️', 'dailyTypes.names.solar_notes', P.notesAcc, 'notesHit', T(145, 235, 360, 500, 680), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 14 }], descriptionParams: { m: '75%' },
  }),
  perf('solar_tick', '☀️', 'dailyTypes.names.solar_tick', P.tickPerfect, 'tickAccuracy', T(76, 86, 90, 92, 95), {
    cap: 99, gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 16 }], descriptionParams: { m: '16' },
  }),
  perf('solar_score', '☀️', 'dailyTypes.names.solar_score', P.scoreAcc, 'score', T(7600, 9600, 11100, 12600, 14100), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 20 }], descriptionParams: { m: '85%' },
  }),
  perf('solar_combo', '☀️', 'dailyTypes.names.solar_combo', P.comboNotes, 'maxCombo', T(54, 76, 102, 128, 178), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 140 }], descriptionParams: { m: '140' },
  }),
];

// ---------------------------------------------------------------------------
// WEEKLY POOL — 100 types
// ---------------------------------------------------------------------------

const WP = {
  songs: 'weeklyTypes.patterns.songs',
  sumPerfect: 'weeklyTypes.patterns.sumPerfect',
  sumGolden: 'weeklyTypes.patterns.sumGolden',
  sumNotes: 'weeklyTypes.patterns.sumNotes',
  sumScore: 'weeklyTypes.patterns.sumScore',
  genreSum: 'weeklyTypes.patterns.genreSum',
  languageSum: 'weeklyTypes.patterns.languageSum',
  atypicalSum: 'weeklyTypes.patterns.atypicalSum',
  languageNotSum: 'weeklyTypes.patterns.languageNotSum',
  decadeSum: 'weeklyTypes.patterns.decadeSum',
  durationMinSum: 'weeklyTypes.patterns.durationMinSum',
  durationMaxSum: 'weeklyTypes.patterns.durationMaxSum',
  freshSum: 'weeklyTypes.patterns.freshSum',
  titleContainsSum: 'weeklyTypes.patterns.titleContainsSum',
  oneWordSum: 'weeklyTypes.patterns.oneWordSum',
  featSum: 'weeklyTypes.patterns.featSum',
  bandSum: 'weeklyTypes.patterns.bandSum',
  questionSum: 'weeklyTypes.patterns.questionSum',
  ratingSum: 'weeklyTypes.patterns.ratingSum',
  bpmMinSum: 'weeklyTypes.patterns.bpmMinSum',
  titleStartsSum: 'weeklyTypes.patterns.titleStartsSum',
  artistStartsSum: 'weeklyTypes.patterns.artistStartsSum',
  coopSum: 'weeklyTypes.patterns.coopSum',
  difficultySum: 'weeklyTypes.patterns.difficultySum',
};

const WNAME_P = {
  genre: 'weeklyTypes.names.genreWeek',
  language: 'weeklyTypes.names.languageWeek',
  decade: 'weeklyTypes.names.decadeWeek',
};

/** compact weekly performance builder (best-of-week) */
function wperf(
  id: string, icon: string, nameKey: string, descKey: string,
  metricKey: DailyMetricKey, targets: Record<DailyDifficulty, number>,
  opts?: { cap?: number; direction?: 'max' | 'min'; gates?: DailyGate[]; descriptionParams?: Record<string, string> },
): WeeklyTypeDefinition {
  return {
    id, icon, nameKey, descriptionKey: descKey, metricKey,
    direction: opts?.direction ?? 'max', aggregation: 'best',
    targets, cap: opts?.cap, gates: opts?.gates, descriptionParams: opts?.descriptionParams,
  };
}

/** compact weekly sum builder (cumulative across the week) */
function wsum(
  id: string, icon: string, nameKey: string, descKey: string,
  metricKey: DailyMetricKey, targets: Record<DailyDifficulty, number>,
  opts?: { descriptionParams?: Record<string, string> },
): WeeklyTypeDefinition {
  return {
    id, icon, nameKey, descriptionKey: descKey, metricKey,
    direction: 'max', aggregation: 'sum', targets,
    descriptionParams: opts?.descriptionParams,
  };
}

/** compact weekly category-sum builder */
function wcat(
  id: string, icon: string, nameKey: string, descKey: string,
  category: DailyCategory, targets: Record<DailyDifficulty, number>,
  opts?: { nameParams?: Record<string, string>; descriptionParams?: Record<string, string> },
): WeeklyTypeDefinition {
  return {
    id, icon, nameKey, descriptionKey: descKey, metricKey: 'category_match',
    direction: 'max', aggregation: 'sum', targets, category,
    nameParams: opts?.nameParams, descriptionParams: opts?.descriptionParams,
  };
}

const SUM_SONGS = T(2, 3, 4, 5, 6);
const SUM_SONGS_HIGH = T(3, 5, 6, 8, 10);

/** The 100 weekly challenge variants. */
export const WEEKLY_TYPE_LIST: readonly WeeklyTypeDefinition[] = [
  // ── Performance — best of week (1–25) ──
  wperf('w_score_peak', '🎵', 'weeklyTypes.names.w_score_peak', P.score, 'score', T(9000, 10500, 12000, 13500, 15000)),
  wperf('w_accuracy_peak', '🎯', 'weeklyTypes.names.w_accuracy_peak', P.accuracy, 'accuracy', T(88, 91, 93, 95, 97), { cap: 99 }),
  wperf('w_combo_peak', '⚡', 'weeklyTypes.names.w_combo_peak', P.combo, 'maxCombo', T(120, 160, 200, 240, 300)),
  wperf('w_perfect_peak', '💎', 'weeklyTypes.names.w_perfect_peak', P.perfect, 'perfectNotesCount', T(60, 90, 120, 160, 220)),
  wperf('w_golden_peak', '✨', 'weeklyTypes.names.w_golden_peak', P.golden, 'goldenNotesCount', T(14, 20, 26, 32, 40)),
  wperf('w_notes_peak', '🎶', 'weeklyTypes.names.w_notes_peak', P.notes, 'notesHit', T(400, 550, 700, 850, 1000)),
  wperf('w_tick_peak', '🎚️', 'weeklyTypes.names.w_tick_peak', P.tick, 'tickAccuracy', T(85, 89, 92, 94, 96), { cap: 99 }),
  wperf('w_clean_peak', '🧼', 'weeklyTypes.names.w_clean_peak', P.missMax, 'notesMissed', T(8, 5, 3, 2, 1), { direction: 'min' }),
  wperf('w_score_elite', '👑', 'weeklyTypes.names.w_score_elite', P.scoreAcc, 'score', T(10000, 11500, 13000, 14500, 16000), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }], descriptionParams: { m: '85%' },
  }),
  wperf('w_accuracy_elite', '👑', 'weeklyTypes.names.w_accuracy_elite', P.accNotes, 'accuracy', T(90, 93, 95, 96, 98), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }], descriptionParams: { m: '100' },
  }),
  wperf('w_combo_colossus', '🗿', 'weeklyTypes.names.w_combo_colossus', P.comboAcc, 'maxCombo', T(150, 190, 230, 270, 330), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 80 }], descriptionParams: { m: '80%' },
  }),
  wperf('w_perfect_storm', '🌩️', 'weeklyTypes.names.w_perfect_storm', P.perfectGolden, 'perfectNotesCount', T(80, 110, 140, 180, 240), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 8 }], descriptionParams: { m: '8' },
  }),
  wperf('w_golden_baron', '👑', 'weeklyTypes.names.w_golden_baron', P.goldenPerfect, 'goldenNotesCount', T(18, 24, 30, 36, 45), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 40 }], descriptionParams: { m: '40' },
  }),
  wperf('w_notes_monsoon', '⛈️', 'weeklyTypes.names.w_notes_monsoon', P.notesCombo, 'notesHit', T(500, 650, 800, 950, 1100), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 80 }], descriptionParams: { m: '80' },
  }),
  wperf('w_score_phantom', '👻', 'weeklyTypes.names.w_score_phantom', P.scoreMiss, 'score', T(9500, 11000, 12500, 14000, 15500), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 8 }], descriptionParams: { m: '8' },
  }),
  wperf('w_apex_accuracy', '😇', 'weeklyTypes.names.w_apex_accuracy', P.accMiss, 'accuracy', T(92, 94, 96, 97, 99), {
    cap: 99, gates: [{ metricKey: 'notesMissed', op: '<=', value: 5 }], descriptionParams: { m: '5' },
  }),
  wperf('w_apex_score', '😇', 'weeklyTypes.names.w_apex_score', P.scoreCombo, 'score', T(10500, 12000, 13500, 15000, 16500), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 70 }], descriptionParams: { m: '70' },
  }),
  wperf('w_double_trouble', '🔀', 'weeklyTypes.names.w_double_trouble', P.scoreAcc, 'score', T(9200, 10700, 12200, 13700, 15200), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 40 }, { metricKey: 'goldenNotesCount', op: '>=', value: 6 }], descriptionParams: { m: '85%' },
  }),
  wperf('w_symphony', '🎼', 'weeklyTypes.names.w_symphony', P.tickNotes, 'tickAccuracy', T(87, 90, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 150 }], descriptionParams: { m: '150' },
  }),
  wperf('w_marathon_notes', '🏃', 'weeklyTypes.names.w_marathon_notes', P.notesAcc, 'notesHit', T(600, 750, 900, 1050, 1200), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 75 }], descriptionParams: { m: '75%' },
  }),
  wperf('w_surgical', '🏥', 'weeklyTypes.names.w_surgical', P.missNotes, 'notesMissed', T(4, 3, 2, 1, 0), {
    direction: 'min', gates: [{ metricKey: 'notesHit', op: '>=', value: 90 }], descriptionParams: { m: '90' },
  }),
  wperf('w_comeback_king', '🔄', 'weeklyTypes.names.w_comeback_king', P.comeback, 'maxCombo', T(100, 130, 160, 190, 230), {
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 15 }], descriptionParams: { m: '15' },
  }),
  wperf('w_score_maestro', '🎩', 'weeklyTypes.names.w_score_maestro', P.scoreAcc, 'score', T(9800, 11300, 12800, 14300, 15800), {
    gates: [{ metricKey: 'tickAccuracy', op: '>=', value: 82 }], descriptionParams: { m: '82%' },
  }),
  wperf('w_perfect_maestro', '🎩', 'weeklyTypes.names.w_perfect_maestro', P.perfectAcc, 'perfectNotesCount', T(70, 100, 130, 170, 230), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 88 }], descriptionParams: { m: '88%' },
  }),
  wperf('w_golden_galore', '🌟', 'weeklyTypes.names.w_golden_galore', P.goldenCombo, 'goldenNotesCount', T(16, 22, 28, 34, 42), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 60 }], descriptionParams: { m: '60' },
  }),

  // ── Cumulative sums (26–32) ──
  wsum('w_songs_5', '🎬', 'weeklyTypes.names.w_songs_5', WP.songs, 'songsCompleted', T(4, 5, 6, 7, 8)),
  wsum('w_songs_10', '🎥', 'weeklyTypes.names.w_songs_10', WP.songs, 'songsCompleted', T(7, 9, 10, 12, 14)),
  wsum('w_songs_15', '🍿', 'weeklyTypes.names.w_songs_15', WP.songs, 'songsCompleted', T(10, 13, 15, 18, 20)),
  wsum('w_perfect_sum', '💠', 'weeklyTypes.names.w_perfect_sum', WP.sumPerfect, 'perfectNotesCount', T(150, 250, 350, 500, 700)),
  wsum('w_golden_sum', '🌟', 'weeklyTypes.names.w_golden_sum', WP.sumGolden, 'goldenNotesCount', T(25, 40, 60, 80, 110)),
  wsum('w_notes_sum', '🎶', 'weeklyTypes.names.w_notes_sum', WP.sumNotes, 'notesHit', T(1000, 1500, 2000, 2600, 3200)),
  wsum('w_score_sum', '🏆', 'weeklyTypes.names.w_score_sum', WP.sumScore, 'score', T(25000, 35000, 45000, 55000, 70000)),

  // ── Genre sums (33–44) ──
  wcat('w_genre_pop', '🎤', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Pop' }, SUM_SONGS, { nameParams: { genre: 'Pop' }, descriptionParams: { genre: 'Pop' } }),
  wcat('w_genre_rock', '🎸', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Rock' }, SUM_SONGS, { nameParams: { genre: 'Rock' }, descriptionParams: { genre: 'Rock' } }),
  wcat('w_genre_metal', '🤘', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Metal' }, SUM_SONGS, { nameParams: { genre: 'Metal' }, descriptionParams: { genre: 'Metal' } }),
  wcat('w_genre_rap', '🎧', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Rap' }, SUM_SONGS, { nameParams: { genre: 'Rap' }, descriptionParams: { genre: 'Rap' } }),
  wcat('w_genre_schlager', '🎊', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Schlager' }, SUM_SONGS, { nameParams: { genre: 'Schlager' }, descriptionParams: { genre: 'Schlager' } }),
  wcat('w_genre_disney', '🏰', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Disney' }, SUM_SONGS, { nameParams: { genre: 'Disney' }, descriptionParams: { genre: 'Disney' } }),
  wcat('w_genre_musical', '🎭', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Musical' }, SUM_SONGS, { nameParams: { genre: 'Musical' }, descriptionParams: { genre: 'Musical' } }),
  wcat('w_genre_rnb', '🎶', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'R&B' }, SUM_SONGS, { nameParams: { genre: 'R&B' }, descriptionParams: { genre: 'R&B' } }),
  wcat('w_genre_country', '🤠', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Country' }, SUM_SONGS, { nameParams: { genre: 'Country' }, descriptionParams: { genre: 'Country' } }),
  wcat('w_genre_latin', '💃', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Latin' }, SUM_SONGS, { nameParams: { genre: 'Latin' }, descriptionParams: { genre: 'Latin' } }),
  wcat('w_genre_kpop', '💖', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'K-Pop' }, SUM_SONGS, { nameParams: { genre: 'K-Pop' }, descriptionParams: { genre: 'K-Pop' } }),
  wcat('w_genre_classical', '🎻', WNAME_P.genre, WP.genreSum, { field: 'genre', value: 'Classical' }, SUM_SONGS, { nameParams: { genre: 'Classical' }, descriptionParams: { genre: 'Classical' } }),

  // ── Language sums (45–54) ──
  wcat('w_lang_german', '🇩🇪', WNAME_P.language, WP.languageSum, { field: 'language', value: 'German' }, SUM_SONGS, { nameParams: { language: 'German' }, descriptionParams: { language: 'German' } }),
  wcat('w_lang_english', '🇬🇧', WNAME_P.language, WP.languageSum, { field: 'language', value: 'English' }, SUM_SONGS, { nameParams: { language: 'English' }, descriptionParams: { language: 'English' } }),
  wcat('w_lang_spanish', '🇪🇸', WNAME_P.language, WP.languageSum, { field: 'language', value: 'Spanish' }, SUM_SONGS, { nameParams: { language: 'Spanish' }, descriptionParams: { language: 'Spanish' } }),
  wcat('w_lang_french', '🇫🇷', WNAME_P.language, WP.languageSum, { field: 'language', value: 'French' }, SUM_SONGS, { nameParams: { language: 'French' }, descriptionParams: { language: 'French' } }),
  wcat('w_lang_italian', '🇮🇹', WNAME_P.language, WP.languageSum, { field: 'language', value: 'Italian' }, SUM_SONGS, { nameParams: { language: 'Italian' }, descriptionParams: { language: 'Italian' } }),
  wcat('w_lang_japanese', '🇯🇵', WNAME_P.language, WP.languageSum, { field: 'language', value: 'Japanese' }, SUM_SONGS, { nameParams: { language: 'Japanese' }, descriptionParams: { language: 'Japanese' } }),
  wcat('w_lang_korean', '🇰🇷', WNAME_P.language, WP.languageSum, { field: 'language', value: 'Korean' }, SUM_SONGS, { nameParams: { language: 'Korean' }, descriptionParams: { language: 'Korean' } }),
  wcat('w_lang_atypical', '🌍', 'weeklyTypes.names.w_globetrotter', WP.atypicalSum, { field: 'atypicalLanguage' }, SUM_SONGS),
  wcat('w_lang_polyglot', '🗣️', 'weeklyTypes.names.w_polyglot', WP.languageNotSum, { field: 'languageNot', value: 'English' }, SUM_SONGS, { descriptionParams: { language: 'English' } }),
  wcat('w_lang_mixed', '🀄', 'weeklyTypes.names.w_mixed', WP.languageNotSum, { field: 'languageNot', value: 'German' }, SUM_SONGS, { descriptionParams: { language: 'German' } }),

  // ── Decade sums (55–62) ──
  wcat('w_decade_60s', '📻', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 1960 }, SUM_SONGS, { nameParams: { decade: '1960' }, descriptionParams: { decade: '1960' } }),
  wcat('w_decade_70s', '🪩', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 1970 }, SUM_SONGS, { nameParams: { decade: '1970' }, descriptionParams: { decade: '1970' } }),
  wcat('w_decade_80s', '📼', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 1980 }, SUM_SONGS, { nameParams: { decade: '1980' }, descriptionParams: { decade: '1980' } }),
  wcat('w_decade_90s', '💿', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 1990 }, SUM_SONGS, { nameParams: { decade: '1990' }, descriptionParams: { decade: '1990' } }),
  wcat('w_decade_00s', '📱', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 2000 }, SUM_SONGS, { nameParams: { decade: '2000' }, descriptionParams: { decade: '2000' } }),
  wcat('w_decade_10s', '📸', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 2010 }, SUM_SONGS, { nameParams: { decade: '2010' }, descriptionParams: { decade: '2010' } }),
  wcat('w_decade_20s', '🚀', WNAME_P.decade, WP.decadeSum, { field: 'decade', value: 2020 }, SUM_SONGS, { nameParams: { decade: '2020' }, descriptionParams: { decade: '2020' } }),
  wcat('w_decade_old', '🎞️', 'weeklyTypes.names.w_vintage', WP.decadeSum, { field: 'yearBefore', value: 1970 }, SUM_SONGS, { descriptionParams: { decade: 'pre-1970' } }),

  // ── Shape sums (63–72) ──
  wcat('w_long_songs', '⏳', 'weeklyTypes.names.w_long_songs', WP.durationMinSum, { field: 'durationMinMinutes', value: 4 }, SUM_SONGS, { descriptionParams: { duration: '4' } }),
  wcat('w_short_songs', '⏱️', 'weeklyTypes.names.w_short_songs', WP.durationMaxSum, { field: 'durationMaxMinutes', value: 3 }, SUM_SONGS, { descriptionParams: { duration: '3' } }),
  wcat('w_fresh_songs', '🆕', 'weeklyTypes.names.w_fresh_songs', WP.freshSum, { field: 'freshSong' }, SUM_SONGS),
  wcat('w_love_songs', '💗', 'weeklyTypes.names.w_love_songs', WP.titleContainsSum, { field: 'titleContains', value: 'love' }, SUM_SONGS, { descriptionParams: { word: 'love' } }),
  wcat('w_one_word', '💬', 'weeklyTypes.names.w_one_word', WP.oneWordSum, { field: 'oneWordTitle' }, SUM_SONGS),
  wcat('w_feat_songs', '🤝', 'weeklyTypes.names.w_feat_songs', WP.featSum, { field: 'featuredArtist' }, SUM_SONGS),
  wcat('w_band_songs', '👥', 'weeklyTypes.names.w_band_songs', WP.bandSum, { field: 'bandArtist' }, SUM_SONGS),
  wcat('w_question_songs', '❓', 'weeklyTypes.names.w_question_songs', WP.questionSum, { field: 'questionTitle' }, SUM_SONGS),
  wcat('w_five_star', '⭐', 'weeklyTypes.names.w_five_star', WP.ratingSum, { field: 'songRating', value: 5 }, SUM_SONGS, { descriptionParams: { rating: '5' } }),
  wcat('w_bpm_fast', '🥁', 'weeklyTypes.names.w_bpm_fast', WP.bpmMinSum, { field: 'bpmMin', value: 140 }, SUM_SONGS, { descriptionParams: { bpm: '140' } }),

  // ── Fun sums (73–79) ──
  wcat('w_duo_week', '👫', 'weeklyTypes.names.w_duo_week', WP.coopSum, { field: 'coopPartner' }, SUM_SONGS),
  wcat('w_diff_hard', '🌶️', 'weeklyTypes.names.w_diff_hard', WP.difficultySum, { field: 'songDifficulty', value: 'hard' }, SUM_SONGS, { descriptionParams: { difficulty: 'hard' } }),
  wcat('w_diff_easy', '🍃', 'weeklyTypes.names.w_diff_easy', WP.difficultySum, { field: 'songDifficulty', value: 'easy' }, SUM_SONGS, { descriptionParams: { difficulty: 'easy' } }),
  wcat('w_title_letter_a', '🔡', 'weeklyTypes.names.w_title_letter_a', WP.titleStartsSum, { field: 'titleStartsRange', value: 'A-M' }, SUM_SONGS, { descriptionParams: { range: 'A–M' } }),
  wcat('w_title_letter_n', '🔠', 'weeklyTypes.names.w_title_letter_n', WP.titleStartsSum, { field: 'titleStartsRange', value: 'N-Z' }, SUM_SONGS, { descriptionParams: { range: 'N–Z' } }),
  wcat('w_artist_am', '🅰️', 'weeklyTypes.names.w_artist_am', WP.artistStartsSum, { field: 'artistStartsRange', value: 'A-M' }, SUM_SONGS, { descriptionParams: { range: 'A–M' } }),
  wcat('w_artist_nz', '🆎', 'weeklyTypes.names.w_artist_nz', WP.artistStartsSum, { field: 'artistStartsRange', value: 'N-Z' }, SUM_SONGS, { descriptionParams: { range: 'N–Z' } }),

  // ── Zephyr tier (80–82) ──
  wperf('w_zephyr_score', '🌬️', 'weeklyTypes.names.w_zephyr_score', P.scoreAcc, 'score', T(9100, 10600, 12100, 13600, 15100), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 82 }], descriptionParams: { m: '82%' },
  }),
  wperf('w_zephyr_combo', '🌬️', 'weeklyTypes.names.w_zephyr_combo', P.comboNotes, 'maxCombo', T(130, 170, 210, 250, 310), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 200 }], descriptionParams: { m: '200' },
  }),
  wperf('w_zephyr_perfect', '🌬️', 'weeklyTypes.names.w_zephyr_perfect', P.perfectMiss, 'perfectNotesCount', T(65, 95, 125, 165, 225), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 12 }], descriptionParams: { m: '12' },
  }),

  // ── Ember tier (83–85) ──
  wperf('w_ember_accuracy', '🔥', 'weeklyTypes.names.w_ember_accuracy', P.accGolden, 'accuracy', T(89, 92, 94, 96, 97), {
    cap: 99, gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }], descriptionParams: { m: '5' },
  }),
  wperf('w_ember_score', '🔥', 'weeklyTypes.names.w_ember_score', P.scoreAcc, 'score', T(9400, 10900, 12400, 13900, 15400), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 35 }], descriptionParams: { m: '85%' },
  }),
  wperf('w_ember_combo', '🔥', 'weeklyTypes.names.w_ember_combo', P.comboGolden, 'maxCombo', T(140, 180, 220, 260, 320), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 6 }], descriptionParams: { m: '6' },
  }),

  // ── Tide tier (86–88) ──
  wperf('w_tide_notes', '🌊', 'weeklyTypes.names.w_tide_notes', P.notesPerfect, 'notesHit', T(450, 600, 750, 900, 1050), {
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 30 }], descriptionParams: { m: '30' },
  }),
  wperf('w_tide_tick', '🌊', 'weeklyTypes.names.w_tide_tick', P.tickCombo, 'tickAccuracy', T(86, 90, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'maxCombo', op: '>=', value: 50 }], descriptionParams: { m: '50' },
  }),
  wperf('w_tide_score', '🌊', 'weeklyTypes.names.w_tide_score', P.scoreAcc, 'score', T(9600, 11100, 12600, 14100, 15600), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 180 }], descriptionParams: { m: '85%' },
  }),

  // ── Dawn tier (89–91) ──
  wperf('w_dawn_accuracy', '🌅', 'weeklyTypes.names.w_dawn_accuracy', P.accNotes, 'accuracy', T(87, 90, 92, 94, 96), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 120 }], descriptionParams: { m: '120' },
  }),
  wperf('w_dawn_perfect', '🌅', 'weeklyTypes.names.w_dawn_perfect', P.perfectCombo, 'perfectNotesCount', T(75, 105, 135, 175, 235), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 55 }], descriptionParams: { m: '55' },
  }),
  wperf('w_dawn_golden', '🌅', 'weeklyTypes.names.w_dawn_golden', P.goldenMiss, 'goldenNotesCount', T(17, 23, 29, 35, 44), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 10 }], descriptionParams: { m: '10' },
  }),

  // ── Dusk tier (92–94) ──
  wperf('w_dusk_score', '🌆', 'weeklyTypes.names.w_dusk_score', P.scoreCombo, 'score', T(9300, 10800, 12300, 13800, 15300), {
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 65 }], descriptionParams: { m: '65' },
  }),
  wperf('w_dusk_accuracy', '🌆', 'weeklyTypes.names.w_dusk_accuracy', P.accPerfect, 'accuracy', T(86, 89, 91, 93, 95), {
    cap: 99, gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 28 }], descriptionParams: { m: '28' },
  }),
  wperf('w_dusk_combo', '🌆', 'weeklyTypes.names.w_dusk_combo', P.comboAcc, 'maxCombo', T(135, 175, 215, 255, 315), {
    gates: [{ metricKey: 'accuracy', op: '>=', value: 84 }], descriptionParams: { m: '84%' },
  }),

  // ── Comet tier (95–97) ──
  wperf('w_comet_notes', '☄️', 'weeklyTypes.names.w_comet_notes', P.notesGolden, 'notesHit', T(480, 630, 780, 930, 1080), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }], descriptionParams: { m: '5' },
  }),
  wperf('w_comet_tick', '☄️', 'weeklyTypes.names.w_comet_tick', P.tickNotes, 'tickAccuracy', T(84, 88, 91, 93, 96), {
    cap: 99, gates: [{ metricKey: 'notesHit', op: '>=', value: 140 }], descriptionParams: { m: '140' },
  }),
  wperf('w_comet_perfect', '☄️', 'weeklyTypes.names.w_comet_perfect', P.perfectGolden, 'perfectNotesCount', T(72, 102, 132, 172, 232), {
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 7 }], descriptionParams: { m: '7' },
  }),

  // ── Nebula tier (98–100) ──
  wperf('w_nebula_score', '🌌', 'weeklyTypes.names.w_nebula_score', P.scoreMiss, 'score', T(9700, 11200, 12700, 14200, 15700), {
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 9 }], descriptionParams: { m: '9' },
  }),
  wperf('w_nebula_accuracy', '🌌', 'weeklyTypes.names.w_nebula_accuracy', P.accCombo, 'accuracy', T(88, 91, 93, 95, 97), {
    cap: 99, gates: [{ metricKey: 'maxCombo', op: '>=', value: 62 }], descriptionParams: { m: '62' },
  }),
  wperf('w_nebula_combo', '🌌', 'weeklyTypes.names.w_nebula_combo', P.comboNotes, 'maxCombo', T(145, 185, 225, 265, 325), {
    gates: [{ metricKey: 'notesHit', op: '>=', value: 210 }], descriptionParams: { m: '210' },
  }),
];
