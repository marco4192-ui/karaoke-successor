/**
 * Rate my Song — Challenge Cards
 *
 * Fun challenge definitions for karaoke performances.
 */

// ── Types ──

export interface RateMySongChallenge {
  id: string;
  icon: string;
  titleEn: string;
  titleDe: string;
  descriptionEn: string;
  descriptionDe: string;
}

// ── Definitions ──

export const RATE_MY_SONG_CHALLENGES: RateMySongChallenge[] = [
  {
    id: 'accent',
    icon: '🎭',
    titleEn: 'Sing with an Accent',
    titleDe: 'Singe mit Akzent',
    descriptionEn: 'Put on your best fake accent for the entire song',
    descriptionDe: 'Leg deinen besten Fake-Akzent für das gesamte Lied auf',
  },
  {
    id: 'silent_minute',
    icon: '🔇',
    titleEn: 'Silent Minute',
    titleDe: 'Stille Minute',
    descriptionEn: 'Stop singing for 10 seconds in the middle, keep performing',
    descriptionDe: 'Hör auf zu singen für 10 Sekunden in der Mitte, perform weiter',
  },
  {
    id: 'dance_break',
    icon: '💃',
    titleEn: 'Dance Break',
    titleDe: 'Tanzpause',
    descriptionEn: 'Do at least 3 dance moves during the song',
    descriptionDe: 'Mach mindestens 3 Tanzmoves während des Liedes',
  },
  {
    id: 'phone_singer',
    icon: '📱',
    titleEn: 'Phone Singer',
    titleDe: 'Handy-Sänger',
    descriptionEn: 'Sing like you\'re recording a TikTok with your phone',
    descriptionDe: 'Sing, als würdest du ein TikTok mit dem Handy aufnehmen',
  },
  {
    id: 'supermarket',
    icon: '🎪',
    titleEn: 'Supermarket Style',
    titleDe: 'Supermarkt-Stil',
    descriptionEn: 'Perform as if you\'re casually singing while grocery shopping',
    descriptionDe: 'Perform, als würdest du beim Einkaufen ganz entspannt singen',
  },
  {
    id: 'tempo_switch',
    icon: '🔄',
    titleEn: 'Tempo Switch',
    titleDe: 'Tempo-Wechsel',
    descriptionEn: 'Start slow, go super fast in the middle, slow again',
    descriptionDe: 'Starte langsam, werd in der Mitte super schnell, wieder langsam',
  },
  {
    id: 'smirk_mode',
    icon: '😏',
    titleEn: 'Smirk Mode',
    titleDe: 'Schmunzel-Modus',
    descriptionEn: 'Keep a confident smirk on your face the ENTIRE time',
    descriptionDe: 'Behalte ein selbstbewusstes Schmunzeln die GANZE Zeit im Gesicht',
  },
  {
    id: 'air_guitar',
    icon: '🎸',
    titleEn: 'Air Guitar Solo',
    titleDe: 'Air-Guitar-Solo',
    descriptionEn: 'Do an air guitar solo during any instrumental part',
    descriptionDe: 'Mach ein Air-Guitar-Solo bei jedem instrumentalen Teil',
  },
  {
    id: 'mic_drop',
    icon: '🎤',
    titleEn: 'Mic Drop',
    titleDe: 'Mic-Drop',
    descriptionEn: 'End the song with a dramatic mic drop pose',
    descriptionDe: 'Beende das Lied mit einer dramatischen Mic-Drop-Pose',
  },
  {
    id: 'diva_mode',
    icon: '👑',
    titleEn: 'Diva Mode',
    titleDe: 'Diva-Modus',
    descriptionEn: 'Sing with maximum drama, hand gestures, and hair flips',
    descriptionDe: 'Sing mit maximalem Drama, Handgesten und Haare-Schwenken',
  },
  {
    id: 'whisper_start',
    icon: '🤫',
    titleEn: 'Whisper Start',
    titleDe: 'Flüster-Start',
    descriptionEn: 'Start the first 15 seconds whispering, then go full power',
    descriptionDe: 'Flüstere die ersten 15 Sekunden, dann gib Vollgas',
  },
  {
    id: 'opera_style',
    icon: '🎭',
    titleEn: 'Opera Style',
    titleDe: 'Oper-Stil',
    descriptionEn: 'Sing as overdramatically as an opera singer',
    descriptionDe: 'Sing so übertrieben wie ein Opernsänger',
  },
  {
    id: 'disco_fever',
    icon: '🕺',
    titleEn: 'Disco Fever',
    titleDe: 'Disco-Fieber',
    descriptionEn: 'Add disco dance moves at every chorus',
    descriptionDe: 'Mach Disco-Tanzmoves bei jedem Refrain',
  },
  {
    id: 'emotional_rollercoaster',
    icon: '😢',
    titleEn: 'Emotional Rollercoaster',
    titleDe: 'Emotionale Achterbahn',
    descriptionEn: 'Switch between crying and laughing expressions',
    descriptionDe: 'Wechsle zwischen weinenden und lachenden Gesichtsausdrücken',
  },
  {
    id: 'country_twist',
    icon: '🤠',
    titleEn: 'Country Twist',
    titleDe: 'Country-Twist',
    descriptionEn: 'Add a country accent and yee-haw gestures',
    descriptionDe: 'Leg einen Country-Akzent und Yeehaw-Gesten hinzu',
  },
];

// ── Public API ──

/**
 * Get a random challenge card (different from the last one if possible).
 */
export function getRandomChallenge(excludeId?: string): RateMySongChallenge {
  const available = excludeId
    ? RATE_MY_SONG_CHALLENGES.filter(c => c.id !== excludeId)
    : RATE_MY_SONG_CHALLENGES;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}
