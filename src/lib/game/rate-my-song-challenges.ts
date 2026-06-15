/**
 * Rate my Song — Challenge Cards
 *
 * Fun challenge definitions for karaoke performances.
 */

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';

// ── Types ──

export interface RateMySongChallenge {
  id: string;
  icon: string;
  title: string;
  titleKey: string;
  description: string;
  descriptionKey: string;
}

// ── Definitions ──

export const RATE_MY_SONG_CHALLENGES: RateMySongChallenge[] = [
  {
    id: 'accent',
    icon: '🎭',
    title: 'Sing with an Accent',
    titleKey: 'rateMySong.challenges.accent.title',
    description: 'Put on your best fake accent for the entire song',
    descriptionKey: 'rateMySong.challenges.accent.description',
  },
  {
    id: 'silent_minute',
    icon: '🔇',
    title: 'Silent Minute',
    titleKey: 'rateMySong.challenges.silentMinute.title',
    description: 'Stop singing for 10 seconds in the middle, keep performing',
    descriptionKey: 'rateMySong.challenges.silentMinute.description',
  },
  {
    id: 'dance_break',
    icon: '💃',
    title: 'Dance Break',
    titleKey: 'rateMySong.challenges.danceBreak.title',
    description: 'Do at least 3 dance moves during the song',
    descriptionKey: 'rateMySong.challenges.danceBreak.description',
  },
  {
    id: 'phone_singer',
    icon: '📱',
    title: 'Phone Singer',
    titleKey: 'rateMySong.challenges.phoneSinger.title',
    description: 'Sing like you\'re recording a TikTok with your phone',
    descriptionKey: 'rateMySong.challenges.phoneSinger.description',
  },
  {
    id: 'supermarket',
    icon: '🎪',
    title: 'Supermarket Style',
    titleKey: 'rateMySong.challenges.supermarketStyle.title',
    description: 'Perform as if you\'re casually singing while grocery shopping',
    descriptionKey: 'rateMySong.challenges.supermarketStyle.description',
  },
  {
    id: 'tempo_switch',
    icon: '🔄',
    title: 'Tempo Switch',
    titleKey: 'rateMySong.challenges.tempoSwitch.title',
    description: 'Start slow, go super fast in the middle, slow again',
    descriptionKey: 'rateMySong.challenges.tempoSwitch.description',
  },
  {
    id: 'smirk_mode',
    icon: '😏',
    title: 'Smirk Mode',
    titleKey: 'rateMySong.challenges.smirkMode.title',
    description: 'Keep a confident smirk on your face the ENTIRE time',
    descriptionKey: 'rateMySong.challenges.smirkMode.description',
  },
  {
    id: 'air_guitar',
    icon: '🎸',
    title: 'Air Guitar Solo',
    titleKey: 'rateMySong.challenges.airGuitarSolo.title',
    description: 'Do an air guitar solo during any instrumental part',
    descriptionKey: 'rateMySong.challenges.airGuitarSolo.description',
  },
  {
    id: 'mic_drop',
    icon: '🎤',
    title: 'Mic Drop',
    titleKey: 'rateMySong.challenges.micDrop.title',
    description: 'End the song with a dramatic mic drop pose',
    descriptionKey: 'rateMySong.challenges.micDrop.description',
  },
  {
    id: 'diva_mode',
    icon: '👑',
    title: 'Diva Mode',
    titleKey: 'rateMySong.challenges.divaMode.title',
    description: 'Sing with maximum drama, hand gestures, and hair flips',
    descriptionKey: 'rateMySong.challenges.divaMode.description',
  },
  {
    id: 'whisper_start',
    icon: '🤫',
    title: 'Whisper Start',
    titleKey: 'rateMySong.challenges.whisperStart.title',
    description: 'Start the first 15 seconds whispering, then go full power',
    descriptionKey: 'rateMySong.challenges.whisperStart.description',
  },
  {
    id: 'opera_style',
    icon: '🎭',
    title: 'Opera Style',
    titleKey: 'rateMySong.challenges.operaStyle.title',
    description: 'Sing as overdramatically as an opera singer',
    descriptionKey: 'rateMySong.challenges.operaStyle.description',
  },
  {
    id: 'disco_fever',
    icon: '🕺',
    title: 'Disco Fever',
    titleKey: 'rateMySong.challenges.discoFever.title',
    description: 'Add disco dance moves at every chorus',
    descriptionKey: 'rateMySong.challenges.discoFever.description',
  },
  {
    id: 'emotional_rollercoaster',
    icon: '😢',
    title: 'Emotional Rollercoaster',
    titleKey: 'rateMySong.challenges.emotionalRollercoaster.title',
    description: 'Switch between crying and laughing expressions',
    descriptionKey: 'rateMySong.challenges.emotionalRollercoaster.description',
  },
  {
    id: 'country_twist',
    icon: '🤠',
    title: 'Country Twist',
    titleKey: 'rateMySong.challenges.countryTwist.title',
    description: 'Add a country accent and yee-haw gestures',
    descriptionKey: 'rateMySong.challenges.countryTwist.description',
  },
];

// ── Helpers ──

/** Get a localized copy of a Rate My Song challenge card. */
export function getLocalizedRateMySongChallenge(
  challenge: RateMySongChallenge,
  language?: Language,
): { title: string; description: string } {
  return {
    title: t(challenge.titleKey, language),
    description: t(challenge.descriptionKey, language),
  };
}

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