import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

/**
 * POST /api/sheet-music — Notenblatt-Erkennung (OMR via vision AI)
 *
 * Receives a base64-encoded sheet music IMAGE (PNG/JPG/WebP/GIF/BMP),
 * sends it to the vision model with a strict OMR prompt and returns the
 * recognized notes as one entry per voice/staff ("Strang") — the client
 * lets the user pick the correct strand and imports it through the same
 * pipeline as the MIDI import (pitch + timing basis, '~' lyrics).
 *
 * PDFs are NOT accepted yet (client shows "Bald verfügbar" hint).
 * Rate limit: 20 requests/minute per IP (shared in-memory limiter).
 */

export const runtime = 'nodejs';

// ─── Types ─────────────────────────────────────────────────────────────

interface SheetMusicNote {
  /** MIDI note number (0-127), clamped. */
  midi: number;
  /** Duration in quarter-note beats (clamped 0.05..16). */
  beats: number;
}

interface SheetMusicVoice {
  id: number;
  label: string;
  noteCount: number;
  notes: SheetMusicNote[];
}

interface SheetMusicAnalysis {
  voices: SheetMusicVoice[];
  /** Quarter-note BPM from the tempo marking (clamped 20..300). */
  tempo: number;
  /** Model self-assessment 0..1 (clamped). */
  confidence: number;
  /** Short model warnings (quality issues, truncation, …). */
  warnings: string;
  /** True when a voice was truncated to the 400-note cap. */
  truncated: boolean;
}

interface SheetMusicRequest {
  imageBase64?: string;
  mimeType?: string;
}

interface SheetMusicResponse {
  success: boolean;
  result?: SheetMusicAnalysis;
  error?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────

const MAX_REQUESTS_PER_MIN = 20;
/** Max base64 chars ≈ 7 MB binary image — keeps the VLM context sane. */
const MAX_BASE64_LENGTH = 10_000_000;
/** Model output cap per voice (linear pass, no chunking). */
const MAX_NOTES_PER_VOICE = 400;
const MAX_VOICES = 8;

const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

/** German user-facing messages — the raw model text never leaks to the UI. */
const MSG_PDF_UNSUPPORTED = 'PDF wird noch nicht unterstützt. Bitte als Bild (PNG/JPG) hochladen.';
const MSG_TOO_LARGE = 'Das Bild ist zu groß. Bitte eine kleinere Datei hochladen.';
const MSG_INVALID_IMAGE = 'Ungültiges Bildformat. Bitte PNG, JPG, WebP, GIF oder BMP verwenden.';
const MSG_RATE_LIMIT = 'Zu viele Anfragen. Bitte kurz warten und es erneut versuchen.';
const MSG_AI_FAILED = 'Die Notenblatt-Erkennung ist fehlgeschlagen. Bitte Bildqualität prüfen und erneut versuchen.';
const MSG_NO_NOTES = 'Es konnten keine Noten erkannt werden. Bitte Bildqualität prüfen und erneut versuchen.';

// ─── OMR prompt (strict JSON output) ───────────────────────────────────

const OMR_PROMPT = `You are an optical music recognition (OMR) engine. Analyze the sheet music image and extract all notes.

Return STRICT JSON ONLY — no markdown, no code fences, no commentary. Exactly this schema:
{
  "voices": [
    {
      "id": 1,
      "label": "Notensystem 1 (oberste Stimme)",
      "noteCount": 23,
      "notes": [ { "midi": 64, "beats": 1.0, "tied": false } ]
    }
  ],
  "tempo": 100,
  "confidence": 0.7,
  "warnings": "..."
}

Rules:
- "voices": EVERY distinct staff/strand you can identify (top staff system, lower staff system, second voice, other stem direction, …). Each becomes one voice the user picks from. Order: top to bottom. At most ${MAX_VOICES} voices.
- "notes" per voice: strictly in reading order (left to right, system after system). Rests are SKIPPED (not listed). Repeats (repeat signs, da capo) are NOT expanded — exactly ONE linear pass over the image.
- "midi": MIDI note number 0-127 (middle C = 60). Apply the key signature and all accidentals (sharps/flats/naturals) you see.
- "beats": note duration in quarter-note beats. Use 0.25 (16th), 0.5 (eighth), 1 (quarter), 2 (half), 4 (whole); dotted = ×1.5 (e.g. dotted quarter = 1.5).
- "tied": when two noteheads are tied together, MERGE them into ONE note with summed "beats" (set "tied": false on the merged note).
- Chords (simultaneous noteheads in one voice): list only the TOP (highest) note per position.
- "noteCount": must equal notes.length. Maximum ${MAX_NOTES_PER_VOICE} notes per voice.
- "tempo": quarter-note BPM from the tempo marking (default 120 when absent).
- "confidence": 0-1 self-assessment of the overall recognition quality.
- "warnings": short text about problems (blurry image, unusual notation, low contrast, many notes, …) or "" when clean.
- "id": 1-based number, "label": short human-readable description of the strand.`;

// ─── Helpers ───────────────────────────────────────────────────────────

/** Clamp a number into [min, max]; NaN → fallback. */
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

/** Strip ```json fences / surrounding prose and return the raw JSON body. */
function extractJsonBody(raw: string): string | null {
  const trimmed = raw.trim();
  // Direct object
  if (trimmed.startsWith('{')) return trimmed;
  // Fenced block ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1].trim().startsWith('{')) return fenceMatch[1].trim();
  // First {...} span somewhere in prose
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0] : null;
}

/** Validate + clamp the parsed model JSON into a SheetMusicAnalysis. */
function sanitizeAnalysis(parsed: unknown): SheetMusicAnalysis | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const rawVoices = Array.isArray(obj.voices) ? obj.voices : [];
  const voices: SheetMusicVoice[] = [];
  let truncatedAny = false;

  for (let i = 0; i < rawVoices.length && voices.length < MAX_VOICES; i++) {
    const rawVoice = rawVoices[i];
    if (!rawVoice || typeof rawVoice !== 'object') continue;
    const voiceObj = rawVoice as Record<string, unknown>;
    const rawNotes = Array.isArray(voiceObj.notes) ? voiceObj.notes : [];
    if (rawNotes.length === 0) continue;

    const notes: SheetMusicNote[] = [];
    for (const rawNote of rawNotes.slice(0, MAX_NOTES_PER_VOICE)) {
      if (!rawNote || typeof rawNote !== 'object') continue;
      const noteObj = rawNote as Record<string, unknown>;
      const midi = clampNumber(noteObj.midi, 0, 127, Number.NaN);
      const beats = clampNumber(noteObj.beats, 0.05, 16, Number.NaN);
      if (Number.isNaN(midi) || Number.isNaN(beats)) continue;
      notes.push({ midi: Math.round(midi), beats: Math.round(beats * 1000) / 1000 });
    }
    if (notes.length === 0) continue;
    if (rawNotes.length > MAX_NOTES_PER_VOICE) truncatedAny = true;

    const label =
      typeof voiceObj.label === 'string' && voiceObj.label.trim().length > 0
        ? voiceObj.label.trim().slice(0, 120)
        : `Stimme ${voices.length + 1}`;

    voices.push({
      id: voices.length + 1,
      label,
      noteCount: notes.length,
      notes,
    });
  }

  if (voices.length === 0) return null;

  const warningsRaw = typeof obj.warnings === 'string' ? obj.warnings.trim().slice(0, 500) : '';
  const warnings =
    truncatedAny && !warningsRaw.includes('400')
      ? `${warningsRaw}${warningsRaw ? ' ' : ''}Hinweis: Die Notenliste wurde nach ${MAX_NOTES_PER_VOICE} Noten pro Stimme gekürzt.`.trim()
      : warningsRaw;

  return {
    voices,
    tempo: Math.round(clampNumber(obj.tempo, 20, 300, 120)),
    confidence: Math.round(clampNumber(obj.confidence, 0, 1, 0.5) * 100) / 100,
    warnings,
    truncated: truncatedAny,
  };
}

// ─── Route ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<SheetMusicResponse>> {
  // Light rate limiting — 20 analyses/min per IP (in-memory, no store).
  if (!checkRateLimit(getClientIp(request), MAX_REQUESTS_PER_MIN)) {
    return NextResponse.json({ success: false, error: MSG_RATE_LIMIT }, { status: 429 });
  }

  let body: SheetMusicRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: MSG_AI_FAILED }, { status: 400 });
  }

  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  if (!imageBase64) {
    return NextResponse.json({ success: false, error: MSG_INVALID_IMAGE }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ success: false, error: MSG_TOO_LARGE }, { status: 400 });
  }

  // PDF guard: explicit mime OR the %PDF- magic bytes (base64: "JVBERi0").
  const mimeType = (typeof body.mimeType === 'string' ? body.mimeType : 'image/png').toLowerCase();
  if (mimeType === 'application/pdf' || imageBase64.startsWith('JVBERi0')) {
    return NextResponse.json({ success: false, error: MSG_PDF_UNSUPPORTED }, { status: 400 });
  }
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ success: false, error: MSG_INVALID_IMAGE }, { status: 400 });
  }

  // ── VLM call (z-ai-web-dev-sdk — backend only) ──
  let content: string | null = null;
  try {
    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OMR_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    content = response.choices[0]?.message?.content ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[SheetMusic] VLM call failed:', err);
    return NextResponse.json({ success: false, error: MSG_AI_FAILED }, { status: 502 });
  }

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ success: false, error: MSG_AI_FAILED }, { status: 502 });
  }

  // ── Parse + validate (never leak raw model text) ──
  let analysis: SheetMusicAnalysis | null = null;
  try {
    const jsonBody = extractJsonBody(content);
    if (jsonBody) {
      analysis = sanitizeAnalysis(JSON.parse(jsonBody));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[SheetMusic] Failed to parse model JSON:', err);
  }

  if (!analysis) {
    return NextResponse.json({ success: false, error: MSG_NO_NOTES }, { status: 502 });
  }

  return NextResponse.json({ success: true, result: analysis });
}
