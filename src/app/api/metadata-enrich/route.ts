import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { isLocalRequest } from '@/app/api/lib/is-local-request';

// ── Types ────────────────────────────────────────────────────────────

interface SongInfo {
  id: string;
  title: string;
  artist: string;
  currentGenre?: string;
  currentLanguage?: string;
}

interface EnrichRequest {
  songs: SongInfo[];
  mode: 'enrich' | 'harmonize';
}

interface Suggestion {
  songId: string;
  field: 'genre' | 'language';
  suggested: string;
  confidence: number;
  reason?: string;
}

interface EnrichResponse {
  success: boolean;
  suggestions?: Suggestion[];
  error?: string;
}

// ── Standard genre/language lists ────────────────────────────────────

const STANDARD_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Dance',
  'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Latin', 'Metal',
  'Punk', 'Indie', 'Folk', 'Classical', 'Soundtrack', 'Musical',
  'Schlager', 'Deutsch-Pop', 'Volksmusik', 'K-Pop', 'J-Pop', 'Disco',
  'Reggaeton', 'House', 'Techno', 'Trance', 'Opera', 'Swing', 'Oldies',
  'Gospel', 'Anime', 'Children', 'Christmas',
];

const STANDARD_LANGUAGES = [
  'Englisch', 'Deutsch', 'Spanisch', 'Französisch', 'Italienisch',
  'Portugiesisch', 'Japanisch', 'Koreanisch', 'Chinesisch', 'Russisch',
  'Niederländisch', 'Polnisch', 'Türkisch', 'Arabisch', 'Schwedisch',
  'Latein', 'Norwegisch', 'Dänisch', 'Finnisch', 'Thailändisch',
  'Hindi', 'Ungarisch', 'Tschechisch', 'Hebräisch', 'Griechisch',
];

// ── Batch size for LLM (process in chunks of N songs) ────────────────

const BATCH_SIZE = 30;

// ── Retry helper ─────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1500): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ── POST handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<EnrichResponse>> {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body: EnrichRequest = await request.json();

    if (!body.songs || !Array.isArray(body.songs) || body.songs.length === 0) {
      return NextResponse.json({ success: false, error: 'Songs array is required' }, { status: 400 });
    }

    if (!body.mode || !['enrich', 'harmonize'].includes(body.mode)) {
      return NextResponse.json({ success: false, error: 'Mode must be "enrich" or "harmonize"' }, { status: 400 });
    }

    let zai;
    try {
      zai = await ZAI.create();
    } catch {
      return NextResponse.json({ success: false, error: 'AI-Dienst nicht verfügbar' }, { status: 503 });
    }

    const mode = body.mode;
    const songs = body.songs;
    const allSuggestions: Suggestion[] = [];

    // Process in batches
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE);
      const batchSuggestions = await processBatch(zai, batch, mode);
      allSuggestions.push(...batchSuggestions);
    }

    return NextResponse.json({ success: true, suggestions: allSuggestions });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[MetadataEnrich] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

/**
 * Process a batch of songs through the LLM.
 */
async function processBatch(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  songs: SongInfo[],
  mode: 'enrich' | 'harmonize'
): Promise<Suggestion[]> {
  const systemPrompt = mode === 'enrich'
    ? buildEnrichPrompt()
    : buildHarmonizePrompt();

  // Build songs description for LLM
  const songsDescription = songs.map((s, idx) => {
    const num = idx + 1;
    if (mode === 'enrich') {
      const missing: string[] = [];
      if (!s.currentGenre) missing.push('genre');
      if (!s.currentLanguage) missing.push('language');
      if (missing.length === 0) return null; // Skip songs that already have both
      return `${num}. "${s.title}" by ${s.artist} — fehlend: ${missing.join(', ')}`;
    } else {
      // Harmonize: always include current values
      return `${num}. "${s.title}" by ${s.artist} — Genre: ${s.currentGenre || '(leer)'}, Sprache: ${s.currentLanguage || '(leer)'}`;
    }
  }).filter(Boolean).join('\n');

  if (!songsDescription) return []; // All songs already complete (enrich mode)

  const completion = await withRetry<string>(async () => {
    const c = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Songs:\n${songsDescription}`,
        },
      ],
      temperature: 0.2,
    });
    const content: string = c.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('Leere LLM-Antwort');
    return content;
  });

  // Parse JSON response
  try {
    const jsonMatch = completion.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      num: number;
      field?: string;
      genre?: string;
      language?: string;
      confidence?: number;
      reason?: string;
    }>;

    const results: Suggestion[] = [];
    const filteredSongs = songs.filter((_, idx) => {
      if (mode === 'enrich') {
        return !songs[idx].currentGenre || !songs[idx].currentLanguage;
      }
      return true;
    });

    for (const item of parsed) {
      const song = filteredSongs[item.num - 1];
      if (!song) continue;

      if (mode === 'enrich') {
        // Enrich: suggest missing fields
        if (item.genre && !song.currentGenre) {
          results.push({
            songId: song.id,
            field: 'genre',
            suggested: item.genre,
            confidence: item.confidence ?? 80,
            reason: item.reason,
          });
        }
        if (item.language && !song.currentLanguage) {
          results.push({
            songId: song.id,
            field: 'language',
            suggested: item.language,
            confidence: item.confidence ?? 80,
            reason: item.reason,
          });
        }
      } else {
        // Harmonize: suggest corrected values for ALL fields
        if (item.genre && item.genre !== song.currentGenre) {
          results.push({
            songId: song.id,
            field: 'genre',
            suggested: item.genre,
            confidence: item.confidence ?? 90,
            reason: item.reason || `"${song.currentGenre || '(leer)'}" → "${item.genre}"`,
          });
        }
        if (item.language && item.language !== song.currentLanguage) {
          results.push({
            songId: song.id,
            field: 'language',
            suggested: item.language,
            confidence: item.confidence ?? 90,
            reason: item.reason || `"${song.currentLanguage || '(leer)'}" → "${item.language}"`,
          });
        }
      }
    }

    return results;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[MetadataEnrich] Failed to parse LLM response:', completion.substring(0, 200));
    return [];
  }
}

/**
 * Build system prompt for enrichment mode (fill missing genre/language).
 */
function buildEnrichPrompt(): string {
  return `Du bist ein Musik-Metadata-Experte. Für jede Song-Liste die fehlende Genre- und/oder Sprach-Metadaten ergänzen.

VERANTWORTUNG: Du bekommst eine Liste von Songs mit fehlenden Metadaten. Bestimme das richtige Genre und die Sprache basierend auf Titel, Künstler und deinem musikalischen Wissen.

STANDARD-GENRES: ${STANDARD_GENRES.join(', ')}
STANDARD-SPRACHEN (Deutsch): ${STANDARD_LANGUAGES.join(', ')}

Regeln:
- Verwende AUSSCHLIESSLICH Genres aus der Standard-Liste. Wähle das bestpassende.
- Verwende AUSSCHLIESSLICH Sprachen aus der Standard-Sprachen-Liste (auf Deutsch).
- confidence: 90+ wenn du sehr sicher bist, 70-89 bei guter Schätzung, 50-69 bei Vermutung.
- Wenn du Genre UND Sprache gleichzeitig vorschlägst, gib beide im selben Objekt an.

Antworte NUR mit einem JSON-Array:
[
  {"num": 1, "genre": "Pop", "language": "Englisch", "confidence": 90, "reason": "Bekannter Pop-Song"},
  {"num": 3, "genre": "K-Pop", "confidence": 85, "reason": "Koreanischer Künstler, K-Pop Genre"},
  {"num": 5, "language": "Deutsch", "confidence": 75, "reason": "Deutscher Künstler"}
]`;
}

/**
 * Build system prompt for harmonization mode (normalize to standard values).
 */
function buildHarmonizePrompt(): string {
  return `Du bist ein Musik-Metadata-Experte. Deine Aufgabe ist es, alle Genre- und Sprach-Einträge auf die offiziellen Standardwerte zu korrigieren.

VERANTWORTUNG: Spezielle, ungültige oder nicht-standard Einträge wie "Bubblegum Pop", "Korean (romanized)", "Alternative Rock" oder "Pop Rock" sollen auf den bestmöglichen Standardwert zurückgeführt werden.

STANDARD-GENRES: ${STANDARD_GENRES.join(', ')}
STANDARD-SPRACHEN (Deutsch): ${STANDARD_LANGUAGES.join(', ')}

Regeln:
- Wähle den BESTPASSENDEN Standardwert für jeden Eintrag.
- "Bubblegum Pop" → "Pop", "Indie Rock" → "Rock" oder "Indie", "Korean (romanized)" → "Koreanisch"
- Wenn der aktuelle Wert bereits ein Standardwert ist und korrekt, KEINEN Vorschlag machen.
- Wenn Genre UND Sprache korrigiert werden müssen, gib beide im selben Objekt an.
- reason: Kurze Erklärung der Korrektur (z.B. "Bubblegum Pop → Pop").

Antworte NUR mit einem JSON-Array (nur Einträge die KORRIGIERT werden müssen):
[
  {"num": 1, "genre": "Pop", "confidence": 95, "reason": "Bubblegum Pop → Pop"},
  {"num": 4, "language": "Koreanisch", "confidence": 90, "reason": "Korean (romanized) → Koreanisch"},
  {"num": 7, "genre": "Rock", "language": "Deutsch", "confidence": 85, "reason": "Deutschrock → Rock"}
]`;
}
