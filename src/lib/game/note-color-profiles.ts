// ===================== NOTE BAR COLOR PROFILES =====================
//
// Each profile defines hit-segment colours, glow shadows, and the
// overall note-bar tint for the full-performance note highway.
// The low-performance mode uses getNoteBackgroundClasses / getNoteBoxShadow
// which are updated separately in note-utils.tsx.
//
// The "neon" profile is the original hardcoded palette.

export interface NoteColorProfile {
  id: string;
  name: string;
  description: string;
  /** 4 colour stops for hit quality */
  hitColors: {
    Perfect: string;
    Great: string;
    Good: string;
    Okay: string;
  };
  /** Per-quality box-shadow glow strings */
  hitGlows: {
    Perfect: string;
    Great: string;
    Good: string;
    Okay: string;
  };
  /** Overall note-bar glow tint (rgba prefix WITHOUT closing paren) */
  glowTint: string;
  /** Low-perf gradient classes for normal notes */
  lowPerfGradient: string;
  /** Low-perf active glow shadow */
  lowPerfActiveGlow: string;
}

/** Helper: create golden/bonus variants from a normal palette */
function withVariants(
  normal: NoteColorProfile,
  overrides?: Partial<Pick<NoteColorProfile, 'glowTint' | 'lowPerfGradient' | 'lowPerfActiveGlow'>>,
): NoteColorProfile {
  return normal; // variants are computed at runtime in note-utils.tsx
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const NOTE_COLOR_PROFILES: NoteColorProfile[] = [
  // ─── 1. NEON (original) ───
  {
    id: 'neon',
    name: 'Neon',
    description: 'Classic neon cyan/green/blue',
    hitColors: {
      Perfect: '#00FF66',
      Great:   '#00DDFF',
      Good:    '#0066FF',
      Okay:    '#6600FF',
    },
    hitGlows: {
      Perfect: '0 0 10px #00FF66, 0 0 20px rgba(0,255,102,.5)',
      Great:   '0 0 8px #00DDFF, 0 0 16px rgba(0,221,255,.4)',
      Good:    '0 0 6px #0066FF, 0 0 12px rgba(0,102,255,.35)',
      Okay:    '0 0 4px #6600FF',
    },
    glowTint: 'rgba(0, 229, 255,',
    lowPerfGradient: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    lowPerfActiveGlow: '0 0 25px rgba(34, 211, 238, 0.7)',
  },

  // ─── 2. SUNSET ───
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange/red/yellow tones',
    hitColors: {
      Perfect: '#FFE066',
      Great:   '#FFA040',
      Good:    '#FF6040',
      Okay:    '#E03020',
    },
    hitGlows: {
      Perfect: '0 0 10px #FFE066, 0 0 20px rgba(255,224,102,.5)',
      Great:   '0 0 8px #FFA040, 0 0 16px rgba(255,160,64,.4)',
      Good:    '0 0 6px #FF6040, 0 0 12px rgba(255,96,64,.35)',
      Okay:    '0 0 4px #E03020',
    },
    glowTint: 'rgba(255, 120, 40,',
    lowPerfGradient: 'bg-gradient-to-r from-orange-400 to-red-500',
    lowPerfActiveGlow: '0 0 25px rgba(251, 146, 60, 0.7)',
  },

  // ─── 3. OCEAN ───
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool aqua/teal/deep blue',
    hitColors: {
      Perfect: '#00FFCC',
      Great:   '#00CED1',
      Good:    '#0099CC',
      Okay:    '#0055AA',
    },
    hitGlows: {
      Perfect: '0 0 10px #00FFCC, 0 0 20px rgba(0,255,204,.5)',
      Great:   '0 0 8px #00CED1, 0 0 16px rgba(0,206,209,.4)',
      Good:    '0 0 6px #0099CC, 0 0 12px rgba(0,153,204,.35)',
      Okay:    '0 0 4px #0055AA',
    },
    glowTint: 'rgba(0, 200, 220,',
    lowPerfGradient: 'bg-gradient-to-r from-teal-400 to-blue-600',
    lowPerfActiveGlow: '0 0 25px rgba(20, 184, 166, 0.7)',
  },

  // ─── 4. AURORA ───
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Green/violet/pink northern lights',
    hitColors: {
      Perfect: '#80FF80',
      Great:   '#60DD90',
      Good:    '#AA66FF',
      Okay:    '#FF66AA',
    },
    hitGlows: {
      Perfect: '0 0 10px #80FF80, 0 0 20px rgba(128,255,128,.5)',
      Great:   '0 0 8px #60DD90, 0 0 16px rgba(96,221,144,.4)',
      Good:    '0 0 6px #AA66FF, 0 0 12px rgba(170,102,255,.35)',
      Okay:    '0 0 4px #FF66AA',
    },
    glowTint: 'rgba(140, 100, 255,',
    lowPerfGradient: 'bg-gradient-to-r from-green-400 to-purple-500',
    lowPerfActiveGlow: '0 0 25px rgba(139, 92, 246, 0.7)',
  },

  // ─── 5. CHERRY ───
  {
    id: 'cherry',
    name: 'Cherry',
    description: 'Pink/magenta/rose with soft glow',
    hitColors: {
      Perfect: '#FF80BF',
      Great:   '#FF40A0',
      Good:    '#DD2080',
      Okay:    '#AA1060',
    },
    hitGlows: {
      Perfect: '0 0 10px #FF80BF, 0 0 20px rgba(255,128,191,.5)',
      Great:   '0 0 8px #FF40A0, 0 0 16px rgba(255,64,160,.4)',
      Good:    '0 0 6px #DD2080, 0 0 12px rgba(221,32,128,.35)',
      Okay:    '0 0 4px #AA1060',
    },
    glowTint: 'rgba(255, 60, 150,',
    lowPerfGradient: 'bg-gradient-to-r from-pink-400 to-rose-500',
    lowPerfActiveGlow: '0 0 25px rgba(244, 114, 182, 0.7)',
  },

  // ─── 6. MONOCHROME ───
  {
    id: 'mono',
    name: 'Mono',
    description: 'Clean white/gray/silver',
    hitColors: {
      Perfect: '#FFFFFF',
      Great:   '#CCCCCC',
      Good:    '#999999',
      Okay:    '#666666',
    },
    hitGlows: {
      Perfect: '0 0 10px #FFFFFF, 0 0 20px rgba(255,255,255,.4)',
      Great:   '0 0 8px #CCCCCC, 0 0 16px rgba(204,204,204,.3)',
      Good:    '0 0 6px #999999, 0 0 12px rgba(153,153,153,.25)',
      Okay:    '0 0 4px #666666',
    },
    glowTint: 'rgba(200, 200, 210,',
    lowPerfGradient: 'bg-gradient-to-r from-gray-300 to-gray-500',
    lowPerfActiveGlow: '0 0 25px rgba(200, 200, 220, 0.6)',
  },
];

/** Golden-note overrides applied ON TOP of any profile */
export const GOLDEN_OVERRIDES = {
  hitColors: { Perfect: '#FFE100', Great: '#FFB800', Good: '#FF8C00', Okay: '#CC5500' },
  hitGlows: {
    Perfect: '0 0 10px #FFE100, 0 0 20px rgba(255,225,0,.5)',
    Great:   '0 0 8px #FFB800, 0 0 16px rgba(255,184,0,.4)',
    Good:    '0 0 6px #FF8C00, 0 0 12px rgba(255,140,0,.35)',
    Okay:    '0 0 4px #CC5500',
  },
  glowTint: 'rgba(255, 193, 7,',
};

/** Bonus-note overrides applied ON TOP of any profile */
export const BONUS_OVERRIDES = {
  hitColors: { Perfect: '#FF0066', Great: '#FF3399', Good: '#FF0055', Okay: '#AA0044' },
  hitGlows: {
    Perfect: '0 0 10px #FF0066, 0 0 20px rgba(255,0,102,.5)',
    Great:   '0 0 8px #FF3399, 0 0 16px rgba(255,51,153,.4)',
    Good:    '0 0 6px #FF0055, 0 0 12px rgba(255,0,85,.35)',
    Okay:    '0 0 4px #AA0044',
  },
  glowTint: 'rgba(255, 20, 147,',
};

/**
 * Resolve the effective color set for a given profile + note type.
 * Golden and bonus notes always use their special palette regardless of profile.
 */
export function resolveNoteColors(
  profile: NoteColorProfile,
  isGolden: boolean,
  isBonus: boolean,
) {
  if (isGolden) return GOLDEN_OVERRIDES;
  if (isBonus) return BONUS_OVERRIDES;
  return {
    hitColors: profile.hitColors,
    hitGlows: profile.hitGlows,
    glowTint: profile.glowTint,
  };
}

/**
 * Get the profile for a given ID, falling back to 'neon' (original).
 */
export function getNoteColorProfile(id: string | null | undefined): NoteColorProfile {
  return NOTE_COLOR_PROFILES.find(p => p.id === id) || NOTE_COLOR_PROFILES[0];
}