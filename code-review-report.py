#!/usr/bin/env python3
"""Code Review Report Generator - Karaoke Successor"""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'skills', 'pdf', 'scripts'))
from pdf import install_font_fallback

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)

# ━━ Fonts ━━
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

pdfmetrics.registerFont(TTFont('TimesNewRoman', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('TimesNewRoman', normal='TimesNewRoman', bold='TimesNewRoman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')

install_font_fallback()

# ━━ Palette ━━
ACCENT = colors.HexColor('#1a7897')
TEXT_PRIMARY = colors.HexColor('#1d1c1b')
TEXT_MUTED = colors.HexColor('#88847b')
BG_SURFACE = colors.HexColor('#e7e4df')
BG_PAGE = colors.HexColor('#f2f0ee')
CRITICAL_COLOR = colors.HexColor('#dc2626')
HIGH_COLOR = colors.HexColor('#ea580c')
MEDIUM_COLOR = colors.HexColor('#d97706')
LOW_COLOR = colors.HexColor('#65a30d')

# ━━ Styles ━━
title_style = ParagraphStyle(name='Title', fontName='TimesNewRoman', fontSize=28, leading=36, alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=6)
subtitle_style = ParagraphStyle(name='Subtitle', fontName='Calibri', fontSize=14, leading=20, textColor=TEXT_MUTED, spaceAfter=18)
h1_style = ParagraphStyle(name='H1', fontName='TimesNewRoman', fontSize=18, leading=24, textColor=ACCENT, spaceBefore=18, spaceAfter=10)
h2_style = ParagraphStyle(name='H2', fontName='TimesNewRoman', fontSize=14, leading=19, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8)
h3_style = ParagraphStyle(name='H3', fontName='TimesNewRoman', fontSize=12, leading=16, textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6)
body_style = ParagraphStyle(name='Body', fontName='TimesNewRoman', fontSize=10.5, leading=16, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=6)
code_style = ParagraphStyle(name='Code', fontName='DejaVuSans', fontSize=8.5, leading=12, textColor=colors.HexColor('#374151'), backColor=colors.HexColor('#f3f4f6'), leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4, borderPadding=6)
bullet_style = ParagraphStyle(name='Bullet', fontName='TimesNewRoman', fontSize=10.5, leading=16, alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=4)
header_cell = ParagraphStyle(name='HeaderCell', fontName='TimesNewRoman', fontSize=9.5, leading=13, textColor=colors.white, alignment=TA_CENTER)
cell_style = ParagraphStyle(name='Cell', fontName='TimesNewRoman', fontSize=9, leading=12, textColor=TEXT_PRIMARY)
cell_left = ParagraphStyle(name='CellLeft', fontName='TimesNewRoman', fontSize=9, leading=12, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
meta_style = ParagraphStyle(name='Meta', fontName='Calibri', fontSize=9, leading=13, textColor=TEXT_MUTED)

W, H = A4
LM = 1.8 * cm
RM = 1.8 * cm
AW = W - LM - RM

doc = SimpleDocTemplate(
    '/home/z/my-project/download/karaoke-code-review-report.pdf',
    pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=2*cm, bottomMargin=2*cm,
    title='Karaoke Successor - Code Review Report',
    author='Z.ai', creator='Z.ai', subject='Comprehensive Code Review'
)

story = []

def add_hr():
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=0.5, color=BG_SURFACE))
    story.append(Spacer(1, 6))

def issue_table(issues):
    """Build a compact table from a list of (id, file, desc) or (id, file, line, desc) tuples."""
    if not issues:
        return
    # Auto-detect format
    is_4col = len(issues[0]) == 4
    if is_4col:
        col_w = [0.07*AW, 0.30*AW, 0.13*AW, 0.50*AW]
        header = [
            Paragraph('<b>ID</b>', header_cell),
            Paragraph('<b>Datei</b>', header_cell),
            Paragraph('<b>Zeile</b>', header_cell),
            Paragraph('<b>Beschreibung</b>', header_cell),
        ]
    else:
        col_w = [0.07*AW, 0.33*AW, 0.60*AW]
        header = [
            Paragraph('<b>ID</b>', header_cell),
            Paragraph('<b>Datei</b>', header_cell),
            Paragraph('<b>Beschreibung</b>', header_cell),
        ]
    data = [header]
    for i, entry in enumerate(issues):
        if is_4col:
            iid, f, ln, desc = entry
            data.append([Paragraph(iid, cell_style), Paragraph(f, cell_left), Paragraph(ln, cell_style), Paragraph(desc, cell_left)])
        else:
            iid, f, desc = entry
            data.append([Paragraph(iid, cell_style), Paragraph(f, cell_left), Paragraph(desc, cell_left)])
    t = Table(data, colWidths=col_w, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), ACCENT),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.4, TEXT_MUTED),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else BG_SURFACE
        style_cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
    t.setStyle(TableStyle(style_cmds))
    story.append(Spacer(1, 10))
    story.append(t)
    story.append(Spacer(1, 6))

# ━━ COVER PAGE ━━
story.append(Spacer(1, 120))
story.append(Paragraph('<b>Karaoke Successor</b>', title_style))
story.append(Paragraph('Comprehensive Code Review Report', subtitle_style))
story.append(Spacer(1, 24))
story.append(HRFlowable(width='40%', thickness=2, color=ACCENT, spaceAfter=18))
story.append(Paragraph('<b>Projekt:</b> Next.js 16 + Tauri v2 Karaoke Application', meta_style))
story.append(Paragraph('<b>Branch:</b> origin/master (Commit: ff4fe31)', meta_style))
story.append(Paragraph('<b>Dateien:</b> 283 Source Files (131 .ts, 130 .tsx, 22 .rs)', meta_style))
story.append(Paragraph('<b>TypeScript:</b> 0 Errors (tsc --noEmit clean)', meta_style))
story.append(Paragraph('<b>ESLint:</b> 171 Errors, 1192 Warnings (React Compiler rules)', meta_style))
story.append(Paragraph('<b>Datum:</b> 4. Mai 2026', meta_style))
story.append(PageBreak())

# ━━ EXECUTIVE SUMMARY ━━
story.append(Paragraph('<b>Executive Summary</b>', h1_style))
story.append(Paragraph(
    'This report presents the results of a comprehensive code review of the Karaoke Successor project, '
    'a Next.js 16.1.3 + Tauri v2 desktop karaoke application. The review covers all 283 source files across '
    'the TypeScript frontend, React components, Zustand state management, custom hooks, audio processing '
    'libraries, AI integrations, and Rust backend. The codebase was analyzed for logic errors, type safety '
    'issues, dead code, code smells, security vulnerabilities, and architectural concerns.', body_style))

story.append(Paragraph(
    'TypeScript compilation is clean with zero errors. The ESLint report shows 171 errors and 1192 warnings, '
    'predominantly from the React Compiler plugin (react-hooks/refs rules). These are largely structural '
    'issues related to ref access patterns during render rather than runtime bugs. The Rust backend could '
    'not be compiled in this environment due to missing toolchain.', body_style))

# Summary stats table
stats_data = [
    [Paragraph('<b>Kategorie</b>', header_cell), Paragraph('<b>Critical</b>', header_cell),
     Paragraph('<b>High</b>', header_cell), Paragraph('<b>Medium</b>', header_cell),
     Paragraph('<b>Low</b>', header_cell), Paragraph('<b>Gesamt</b>', header_cell)],
    [Paragraph('Logic Errors', cell_left), Paragraph('2', cell_style), Paragraph('4', cell_style),
     Paragraph('12', cell_style), Paragraph('6', cell_style), Paragraph('24', cell_style)],
    [Paragraph('Type Safety', cell_left), Paragraph('1', cell_style), Paragraph('3', cell_style),
     Paragraph('8', cell_style), Paragraph('14', cell_style), Paragraph('26', cell_style)],
    [Paragraph('Dead Code', cell_left), Paragraph('1', cell_style), Paragraph('0', cell_style),
     Paragraph('6', cell_style), Paragraph('22', cell_style), Paragraph('29', cell_style)],
    [Paragraph('Code Smells', cell_left), Paragraph('0', cell_style), Paragraph('2', cell_style),
     Paragraph('14', cell_style), Paragraph('18', cell_style), Paragraph('34', cell_style)],
    [Paragraph('Missing Error Handling', cell_left), Paragraph('0', cell_style), Paragraph('0', cell_style),
     Paragraph('5', cell_style), Paragraph('8', cell_style), Paragraph('13', cell_style)],
    [Paragraph('Security', cell_left), Paragraph('1', cell_style), Paragraph('0', cell_style),
     Paragraph('1', cell_style), Paragraph('0', cell_style), Paragraph('2', cell_style)],
    [Paragraph('<b>Total</b>', cell_left), Paragraph('<b>5</b>', cell_style), Paragraph('<b>9</b>', cell_style),
     Paragraph('<b>46</b>', cell_style), Paragraph('<b>68</b>', cell_style), Paragraph('<b>128</b>', cell_style)],
]
cw = [AW*0.28, AW*0.12, AW*0.10, AW*0.14, AW*0.14, AW*0.14]
t = Table(stats_data, colWidths=cw, hAlign='CENTER')
style_cmds = [
    ('BACKGROUND', (0,0), (-1,0), ACCENT),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.4, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('BACKGROUND', (0,-1), (-1,-1), BG_SURFACE),
]
for i in range(1, len(stats_data)-1):
    bg = colors.white if i % 2 == 1 else BG_SURFACE
    style_cmds.append(('BACKGROUND', (0,i), (-1,i), bg))
t.setStyle(TableStyle(style_cmds))
story.append(Spacer(1, 12))
story.append(t)
story.append(Spacer(1, 18))

# ━━ SECTION 1: CRITICAL ISSUES ━━
story.append(Paragraph('<b>1. Critical Issues (5)</b>', h1_style))
story.append(Paragraph(
    'These issues represent the most severe problems in the codebase that could cause runtime crashes, '
    'data corruption, security breaches, or fundamentally broken features. They should be addressed '
    'with the highest priority.', body_style))

story.append(Paragraph('<b>1.1 Security: Tauri Origin Check Bypass</b>', h2_style))
story.append(Paragraph('<b>SEC-01</b> | is-local-request.ts:17-24 | <b>Critical</b>', h3_style))
story.append(Paragraph(
    'The security middleware that validates Tauri requests uses <b>startsWith("https://tauri.")</b> to '
    'identify legitimate Tauri origin requests. The code comment explicitly warns against using startsWith '
    'to prevent subdomain spoofing, yet the implementation contradicts its own documentation. An attacker-controlled '
    'domain such as "https://tauri.evil.com" would pass the check, exposing all local-only API endpoints '
    '(config, lyrics, song-identify, cover-generate) that proxy API keys and sensitive operations. This is a '
    'significant security vulnerability in the authentication boundary.', body_style))
story.append(Paragraph(
    'The fix requires replacing startsWith with a strict regex pattern that matches the actual Tauri '
    'origin format, such as "^https?://tauri\\.localhost(:\\d+)?$".', body_style))

story.append(Paragraph('<b>1.2 Logic: Comeback Detection Uses Wrong Field</b>', h2_style))
story.append(Paragraph('<b>LOG-01</b> | use-game-loop.ts:743-749 | <b>Critical</b>', h3_style))
story.append(Paragraph(
    'The comeback detection achievement checks whether a player reaches 50+ combo after accumulating '
    '10+ missed notes. However, it reads <b>activePlayer.maxCombo</b> (the all-time highest combo ever '
    'achieved) instead of the player\'s current active combo. This means a player who hit a 50-combo at '
    'the very beginning of a song (with 0 misses) would immediately trigger the "comeback" achievement '
    'once they later accumulate 10 misses - which is not a comeback at all. The Player interface does not '
    'expose a current combo field, making this a structural issue that requires either adding the field to '
    'the store type or reading the combo from a different source.', body_style))

story.append(Paragraph('<b>1.3 Logic: Challenge Mode Score Comparison Ignores Challenge Type</b>', h2_style))
story.append(Paragraph('<b>LOG-02</b> | daily-challenge.ts:232-240 | <b>Critical</b>', h3_style))
story.append(Paragraph(
    'When a player submits a second result for the same daily challenge, the code only compares '
    '<b>result.score</b> to decide if the entry should be updated. However, challenges can have types '
    'such as "accuracy", "combo", or "perfect_notes" where the score is irrelevant. A player who '
    'improves their accuracy from 70% to 95% but scores lower in points would have their entry silently '
    'discarded because the comparison only looks at score. The existing sortMetric function (line 259) '
    'already handles this correctly for rankings but is not used for the update comparison.', body_style))

story.append(Paragraph('<b>1.4 Logic: Stale Closure in Music Reactive Background</b>', h2_style))
story.append(Paragraph('<b>LOG-03</b> | music-reactive-background.tsx:89-90 | <b>Critical</b>', h3_style))
story.append(Paragraph(
    'The animate function is created inside a useEffect with empty dependencies, closing over the initial '
    '<b>volume</b> prop. However, lines 89-90 use the stale <b>volume</b> variable instead of <b>vol</b> '
    '(which correctly reads from volumeRef.current). This means the particle size and alpha calculations '
    'are permanently stuck at the initial volume level and never respond to actual volume changes during '
    'playback, defeating the entire purpose of the music-reactive background feature.', body_style))

story.append(Paragraph('<b>1.5 Logic: Direct Mutation of Shared Song Object</b>', h2_style))
story.append(Paragraph('<b>LOG-04</b> | ptm-game-screen.tsx:491 | <b>Critical</b>', h3_style))
story.append(Paragraph(
    'The code mutates <b>songToCheck.lyrics = lyrics</b> directly on an object that is either a prop or '
    'derived from hooks/store state. This bypasses React\'s immutability contract and can cause stale closures, '
    'missed re-renders, and hard-to-debug state inconsistencies. Other components referencing the same song '
    'object may see unexpected lyrics changes. The fix requires creating a new object copy or using a proper '
    'state update mechanism.', body_style))

# ━━ SECTION 2: HIGH SEVERITY ━━
story.append(PageBreak())
story.append(Paragraph('<b>2. High Severity Issues (9)</b>', h1_style))
story.append(Paragraph(
    'These issues are serious but less immediately dangerous than critical ones. They include potential '
    'runtime crashes, incorrect feature behavior, and security exposure.', body_style))

high_issues = [
    ('SEC-02', 'config/route.ts:38', 'API key masking reveals entire key when length <= 4 chars. "abc" becomes "--------abc".'),
    ('LOG-05', 'use-game-loop.ts:597-619', 'Double-disconnect of AudioEffectsEngine when setAudioEffects(null) triggers re-render.'),
    ('LOG-06', 'use-note-scoring.ts:607', 'p1PerfectNotesCount returned from ref never triggers re-render; UI shows stale values.'),
    ('LOG-07', 'pitch-detector.ts:350', 'Non-null assertion on yinBuffer crashes if initialize() failed or was not called.'),
    ('LOG-08', 'multi-format-import.ts:309', 'Division by zero when MIDI ticksPerBeat is 0 - produces Infinity for all timings.'),
    ('LOG-09', 'medley-setup.tsx:96-104', 'Stale closure reads old teamAIds/teamBIds inside setSelectedPlayers updater.'),
    ('TYPE-01', 'ptm-game-screen.tsx:419-420', 'useRef() called inside useEffect - violates React hooks rules.'),
    ('TYPE-02', 'ptm-song-results.tsx:411-413', 'Null dereference crash when round.playerScores is empty (sorted()[0] = undefined).'),
    ('TYPE-03', 'ptm-hud-controls.tsx:55', 'getCurrentWindow() called unconditionally - crashes on web/non-Tauri platforms.'),
]
issue_table(high_issues)

# ━━ SECTION 3: MEDIUM SEVERITY ━━
story.append(Paragraph('<b>3. Medium Severity Issues (46)</b>', h1_style))
story.append(Paragraph(
    'Medium severity issues include logic errors with limited blast radius, type safety gaps, missing error '
    'handling, and dead code that increases maintenance burden. These should be addressed in a systematic '
    'refactoring pass.', body_style))

story.append(Paragraph('<b>3.1 Logic Errors (12)</b>', h2_style))
med_logic = [
    ('LOG-10', 'daily-challenge.ts:383-384', 'weeklyProgress never resets - shows all-time data, not current week.'),
    ('LOG-11', 'player-progression.ts:296-298', 'Rank requirement type silently passes with break - no actual rank check.'),
    ('LOG-12', 'results-screen.tsx:264,300', 'isDuelWin treats cooperative duet as competitive duel.'),
    ('LOG-13', 'home-screen.tsx:25', 'PARTY_GAME_COUNT=8 but party-screen.tsx defines 9 game modes.'),
    ('LOG-14', 'game-hud.tsx:18', 'Volume meter overflows container when volume > 1.0 (no clamping).'),
    ('LOG-15', 'use-game-flow-handlers.ts:36', 'perfectNotesCount: 0 hardcoded for all tournament results.'),
    ('LOG-16', 'use-multi-pitch-detector.ts:181', 'Stale closure: uses players from closure instead of playersRef.current.'),
    ('LOG-17', 'competitive-words-blind.ts:126-162', 'Odd player counts leave some players with fewer rounds than bestOf.'),
    ('LOG-18', 'playing-view.tsx:83', 'isLowest relies on implicit ascending sort order - fragile.'),
    ('LOG-19', 'note-highway.tsx:66', 'Division by zero when count=1: 0/(1-1) = NaN breaks CSS.'),
    ('LOG-20', 'library-screen.tsx:91-98', 'useEffect missing viralCharts.status dependency.'),
    ('LOG-21', 'medley-snippet-generator.ts:38', 'Biased shuffle via sort(() => Math.random()-0.5) - unfair song order.'),
]
issue_table(med_logic)

story.append(Paragraph('<b>3.2 Type Safety (8)</b>', h2_style))
med_type = [
    ('TYPE-04', 'party-setup-section.tsx:207', 'Unsafe cast: maxPlayers as 2|4|8|16|32 without validation.'),
    ('TYPE-05', 'party-game-screens.tsx:409', 'medleySongList typed as any[] - loses all type safety.'),
    ('TYPE-06', 'party-game-screens.tsx:475-538', '6x non-null assertions on party.competitiveGame in closures.'),
    ('TYPE-07', 'use-game-settings.ts:45,66,101', 'Unsafe "as NoteShapeStyle" cast from localStorage without validation.'),
    ('TYPE-08', 'competitive-words-blind.tsx:91', 'bestOf cast as 1|3|5|7 without runtime validation.'),
    ('TYPE-09', 'duet-note-highway.tsx:175,244,280', 'gameMode cast to narrow union that excludes pass-the-mic.'),
    ('TYPE-10', 'single-player-lyrics.tsx:191', 'gameMode union missing pass-the-mic, but passed from ptm-game-screen.'),
    ('TYPE-11', 'results-screen.tsx:264', 'isDuel includes duet mode - cooperative duets trigger duel-win achievements.'),
]
issue_table(med_type)

story.append(Paragraph('<b>3.3 Missing Error Handling (5)</b>', h2_style))
med_error = [
    ('ERR-01', 'use-companion-sync.ts:72-82', 'fetchCompanionQueue swallows all errors with empty catch, no response.ok check.'),
    ('ERR-02', 'queue-screen.tsx:97-107', 'fetchCompanionQueue has no response.ok check - 404/500 passes silently.'),
    ('ERR-03', 'use-native-audio.ts:192-201', 'stop() resets UI state even when stopAudio() throws - masks errors.'),
    ('ERR-04', 'audio-effects.ts:462-473', 'disconnect() leaves effect nodes dangling - old nodes not disconnected on re-init.'),
    ('ERR-05', 'rate-my-song-screen.tsx:653', 'useEffect with [] deps reads result/songId from stale closure.'),
]
issue_table(med_error)

story.append(Paragraph('<b>3.4 Dead Code (6)</b>', h2_style))
med_dead = [
    ('DC-01', 'player-progression.ts:79-138', 'Title interface and TITLES array (35 lines) never referenced.'),
    ('DC-02', 'player-progression.ts:332-358', '7 stat fields never updated: streaks, challengesCompleted, milestones.'),
    ('DC-03', 'use-mobile.ts:1-19', 'Entire file dead - useIsMobile() never imported anywhere.'),
    ('DC-04', 'pass-the-mic-screen.tsx:178-307', 'PassTheMicSeriesResults function (~130 lines) superseded by PtmSeriesResults.'),
    ('DC-05', 'use-practice-playback.ts:78-87', 'setLoopStart/setLoopEnd are identical and never called by consumers.'),
    ('DC-06', 'scoring.ts:2', 'Note import unused - calculateScoringMetadata uses inline type.'),
]
issue_table(med_dead)

story.append(Paragraph('<b>3.5 Code Smells and Architecture (15)</b>', h2_style))
med_smell = [
    ('SM-01', 'results-screen.tsx:298,383', 'getExtendedStats() called twice in same effect - wasteful.'),
    ('SM-02', 'settings-screen.tsx:46,165', 'forceUpdate anti-pattern using useState(0) counter.'),
    ('SM-03', 'settings-screen.tsx:32-33', 'Unnecessary alias indirection: AIAssetsGenerator = AIAssetsGeneratorTab.'),
    ('SM-04', 'party-game-screens.tsx:143', 'Entire party store object in useEffect deps - re-runs on every state change.'),
    ('SM-05', 'lyric-line-display.tsx:41-42', 'Module-level mutable singleton for shared interval - fragile with SSR/testing.'),
    ('SM-06', 'ptm-game-screen.tsx:738-793', 'Triplicated onEnded logic across audio/video/GameBackground.'),
    ('SM-07', 'ptm-hud-controls.tsx:69-94', 'Imperative DOM mutation for webcam toggle bypasses React virtual DOM.'),
    ('SM-08', 'ptm-next-song.ts:12-41', 'Duplicated segment generation logic (already extracted to ptm-segments.ts).'),
    ('SM-09', 'ultrastar-parser.ts:22', 'Reverse dependency: lib/parser imports from component/youtube-player.'),
    ('SM-10', 'daily-challenge.ts:47-61', 'Magic numbers in XP rewards - TOP_3_BONUS [50,30,20], STREAK_BONUS_BASE 10.'),
    ('SM-11', 'store.ts:486', 'Magic number: highscore capped at 1000 without named constant.'),
    ('SM-12', 'use-editor-history.ts:42-54', 'Nested setState inside setState updater - unusual, hard to reason about.'),
    ('SM-13', 'songs/route.ts + mobile/route.ts', 'Duplicate rate-limiting logic (3 copies, inconsistent defaults).'),
    ('SM-14', 'medley-setup.tsx:9', 'import type for PLAYER_COLORS runtime constant - erased at compile time.'),
    ('SM-15', 'unified-party-setup.components.tsx:266', 'No-op ternary: both branches return selectedPlayers.'),
]
issue_table(med_smell)

# ━━ SECTION 4: LOW SEVERITY ━━
story.append(PageBreak())
story.append(Paragraph('<b>4. Low Severity Issues (68)</b>', h1_style))
story.append(Paragraph(
    'Low severity issues are cosmetic, performance micro-optimizations, or code style improvements. They '
    'do not affect correctness but should be cleaned up during regular maintenance cycles.', body_style))

story.append(Paragraph('<b>4.1 Dead Code - Unused Imports and Variables (22 items)</b>', h2_style))
low_dead = [
    ('DC-07', 'note-highway.tsx:4', 'Unused import: PLAYER_COLORS.'),
    ('DC-08', 'game-enhancements.tsx:5', 'Unused import: Badge from @/components/ui/badge.'),
    ('DC-09', 'pass-the-mic-screen.tsx:5', 'Unused import: Song.'),
    ('DC-10', 'ptm-song-results.tsx:3', 'Unused import: useRef.'),
    ('DC-11', 'medley-game-screen.tsx:16', 'Unused import: MedleyPlayerRoundScore.'),
    ('DC-12', 'editor-screen.tsx:244', 'Unused destructured: setSong from useGameStore.'),
    ('DC-13', 'editor-screen.tsx:282', 'Unused variable: incompleteSongs computed but never referenced.'),
    ('DC-14', 'microphone-manager.ts:1', 'Unused import: registerCleanup.'),
    ('DC-15', 'tauri-file-storage.ts:6', 'Unused imports: readTextFile, exists.'),
    ('DC-16', 'tauri-file-storage.ts:87-90', 'Unused function: getTauri() - never called.'),
    ('DC-17', 'media-db.ts:206-226', 'Unused functions: hasMedia, clearAllMedia (not exported/called).'),
    ('DC-18', 'mobile-state.ts:11-18', 'Unused exports: setAdminPin, getAdminPin - never imported.'),
    ('DC-19', 'mobile-state.ts:192-195', 'Empty if block after removeClient() - debugging leftover.'),
    ('DC-20', 'mobile-pitch-polling.ts:45', 'backoffTimer declared but never assigned - dead variable.'),
    ('DC-21', 'game-screen.tsx:326', 'timingOffset=0 always - dead constant, feature not implemented.'),
    ('DC-22', 'game-screen.tsx:642', 'Empty onLoadStart handler: () => {} - no-op prop.'),
    ('DC-23', 'use-mobile-connection.ts:42,177', 'Duplicate inline GameState initial object.'),
    ('DC-24', 'get-handlers.ts:2', '7 of 9 imported types never used in file.'),
    ('DC-25', 'game.ts:219-235', 'QueueItem exported but never imported from this module.'),
    ('DC-26', 'score-events-display.tsx:6', 'ScoreEvent.type field defined but never read.'),
    ('DC-27', 'match-abort-dialog.tsx:9,24', 'bracket prop declared but never used.'),
    ('DC-28', 'tournament-screen.tsx:239', 'songs prop in TournamentBracketViewProps unused.'),
]
issue_table(low_dead)

story.append(Paragraph('<b>4.2 Code Smells and Minor Issues (46 items)</b>', h2_style))
low_smell = [
    ('SM-16', 'mic-indicator.tsx:167', 'Always-true ternary: both branches return same emoji.'),
    ('SM-17', 'note-highway.tsx:202', 'Unreachable opacity branch - already filtered by line 149.'),
    ('SM-18', 'ptm-song-results.tsx:191', 'Typo: "Nachstes" should be "Nachstes" (missing umlaut).'),
    ('SM-19', 'game-countdown.tsx:21', 'CSS animation "countdownPop" not defined in file - external dependency.'),
    ('SM-20', 'score-events-display.tsx:26-49', 'Deeply nested ternaries for className and boxShadow.'),
    ('SM-21', 'note-lane.tsx:202,217,225', 'Tripled localStorage validation for valid note shapes.'),
    ('SM-22', 'use-mobile-data.ts:65-108', 'fuzzyScore defined inside component body - recreated every render.'),
    ('SM-23', 'use-global-remote-control.ts:226', 'Unnecessary default export alongside named export.'),
    ('SM-24', 'use-keyboard-shortcuts.ts:1', 'Missing "use client" directive despite using hooks.'),
    ('SM-25', 'companion-singalong-screen.tsx:57', 'Dead state: settings always DEFAULT_SETTINGS, setter discarded.'),
    ('SM-26', 'unified-party-setup.components.tsx:844', 'Trivial identity wrapper: handleVote = (id) => onVote(id).'),
    ('SM-27', 'ptm-game-screen.tsx:128-129', 'Force-render hack without explanatory comment.'),
    ('SM-28', 'ptm-game-screen.tsx:858', 'German comment in otherwise English codebase.'),
    ('SM-29', 'use-youtube-game.ts:88', 'Magic number: ad countdown max 30 seconds.'),
    ('SM-30', 'use-network-status.ts:20', 'Hardcoded API base URL in source.'),
    ('SM-31', 'visual-effects.tsx:399-403', 'bgImageRef never resets when backgroundImage prop changes.'),
    ('SM-32', 'prominent-score-display.tsx:30', 'drop-shadow on text-transparent is invisible.'),
    ('SM-33', 'duet-note-highway.tsx:88 vs 105', 'Inconsistent optional chaining: P1 uses ?., P2 uses ??.'),
    ('SM-34', 'ptm-next-song.ts:48', 'Biased shuffle: sort(() => Math.random()-0.5) instead of Fisher-Yates.'),
    ('SM-35', 'ai/song-identifier.ts:21-22', 'Unbounded in-memory cache Map with no eviction policy.'),
    ('SM-36', 'game.ts:367-374', 'getRankTitle duplicates logic already available via RANKING_TITLES.'),
    ('SM-37', 'shared-media-source.ts:21,59', 'connected boolean field set but never read.'),
    ('SM-38', 'pitch-detector.ts:210-211', 'Unnecessary Float32Array type assertions (already correct type).'),
    ('SM-39', 'audio-effects.ts:222', 'Unnecessary Float32Array type assertion on distortion curve.'),
    ('SM-40', 'ptm-game-screen.tsx:240', 'Magic number: 250ms scoring throttle unexplained.'),
    ('SM-41', 'folder-scanner.ts:639,641', 'Missing NaN guard for parseFloat of previewStart/previewDuration.'),
    ('SM-42', 'tauri-file-storage.ts:624', 'Redundant ternary: x ? x : undefined simplifies to x.'),
    ('SM-43', 'audio-effects.ts:311-312', 'hasEffectSends evaluates AudioNode objects as booleans.'),
    ('SM-44', 'player-progression.ts:470', 'Function parameter reassignment: if (...) xp = 0.'),
    ('SM-45', 'player-progression.ts:732', 'Locale-dependent date string: new Date().toDateString().'),
    ('SM-46', 'pitch-graph.ts:204', 'scheme parameter should use union type instead of string.'),
    ('SM-47', 'youtube-player.tsx:32', 'DIRECT_VIDEO_EXTENSIONS includes .m3u8/.mpd (not direct video files).'),
    ('SM-48', 'youtube-player.tsx:248', 'Double type assertion: as unknown as Record<string,number>.'),
    ('SM-49', 'use-editor-keyboard-shortcuts.ts:96-98', 'Unsafe "as Note" assertion on clipboard JSON - no validation.'),
    ('SM-50', 'spectrogram-display.tsx:233-237', 'Canvas pixel dimensions may mismatch CSS scaling.'),
    ('SM-51', 'webcam-background.tsx:379', 'WebcamSettingsPanel uses independent hook instance, not connected to actual.'),
    ('SM-52', 'lyrics-assistant.ts:52', 'response.json() on non-JSON error body without try/catch.'),
    ('SM-53', 'medley-types.ts:71', 'transitionTime: 3 typed as literal, but UI allows changing value.'),
    ('SM-54', 'unified-party-setup.hook.ts:30-31', 'settings state as Record<string,any> loses all type safety.'),
    ('SM-55', 'cover-generate.ts:86-89', 'Genre lookup case handling edge cases (k-pop input).'),
    ('SM-56', 'lyrics-suggestions/route.ts:2', 'Uses ZAI SDK defaults, ignoring file-based .z-ai-config.'),
    ('SM-57', 'song-identify/route.ts:2', 'Uses ZAI SDK defaults, ignoring file-based .z-ai-config.'),
    ('SM-58', 'daily-challenge.ts:383', 'weeklyProgress array never resets at week boundary.'),
    ('SM-59', 'use-app-effects.ts:55-56', 'Dual event listeners: themeChanged + themeChange (uncertainty).'),
    ('SM-60', 'competitive-words-blind.tsx:294', 'Entire game object in useEffect deps - re-fires on every change.'),
    ('SM-61', 'editor-screen.tsx:99+', 'German strings hardcoded instead of using i18n system.'),
    ('SM-62', 'results-screen.tsx:554', 'Hardcoded German "UNENTSCHIEDEN" instead of t() translation.'),
]
issue_table(low_smell)

# ━━ SECTION 5: DEAD CODE CATALOG ━━
story.append(PageBreak())
story.append(Paragraph('<b>5. Dead Code Catalog (Listed, Not Deleted)</b>', h1_style))
story.append(Paragraph(
    'The following items are identified as dead code - they are defined/declared but never referenced by '
    'any other code in the project. They are listed here for review before removal. Each entry includes '
    'the presumed original function to help evaluate whether the code should be revived, kept for future '
    'use, or safely removed.', body_style))

story.append(Paragraph('<b>5.1 Entire Files</b>', h2_style))
story.append(Paragraph(
    '<b>DC-F01: use-mobile.ts</b> (19 lines) - A useIsMobile() hook that is never imported anywhere in the '
    'project. The hook detects mobile viewport width using window.innerWidth. It was likely created during '
    'early development for responsive layout decisions but was superseded by a different approach. All '
    'components that need mobile detection use other mechanisms (useMediaQuery, CSS media queries, or the '
    'Tauri platform check). Safe to remove.', body_style))

story.append(Paragraph('<b>5.2 Unused Functions and Classes</b>', h2_style))
dead_funcs = [
    ('DC-F02', 'pass-the-mic-screen.tsx:178-307', 'PassTheMicSeriesResults', '~130 lines. Superseded by PtmSeriesResults in ptm-song-results.tsx during PTM refactor. Old component still defined but never called.'),
    ('DC-F03', 'tauri-file-storage.ts:87-90', 'getTauri()', '4 lines. Conditional Tauri module loader. Never called - all consumers import @tauri-apps directly at module level.'),
    ('DC-F04', 'media-db.ts:206-212', 'hasMedia()', '7 lines. Checks if media file exists for a song. Not exported, not called. Likely from an earlier caching strategy.'),
    ('DC-F05', 'media-db.ts:215-226', 'clearAllMedia()', '12 lines. Deletes all cached media. Not exported, not called. May be useful for a "clear cache" feature.'),
    ('DC-F06', 'ptm-next-song.ts:12-41', 'generatePassTheMicSegments()', '30 lines. Exact duplicate of generatePtmSegments in ptm-segments.ts. Violates DRY - should import from ptm-segments.'),
    ('DC-F07', 'player-progression.ts:79-138', 'Title interface + TITLES array', '60 lines. Defines 20+ title objects. Never imported. checkTitleUnlocks uses hardcoded IDs instead.'),
    ('DC-F08', 'use-practice-playback.ts:78-87', 'setLoopStart / setLoopEnd', '10 lines. Identical implementations. Destructured by game-screen.tsx but never called.'),
]
issue_table(dead_funcs)

story.append(Paragraph('<b>5.3 Unused Exports and Variables</b>', h2_style))
dead_vars = [
    ('DC-V01', 'mobile-state.ts:11-18', 'setAdminPin / getAdminPin', '8 lines. Exported but never imported. Admin PIN only set via env var GAME_PIN.'),
    ('DC-V02', 'scoring.ts:2', 'Note import', 'Unused type import. Function uses inline Array<{duration, isGolden}>.'),
    ('DC-V03', 'use-note-scoring.ts:61,124', 'beatDuration prop', 'Accepted in options but never used. Actual value from timingData.'),
    ('DC-V04', 'editor-screen.tsx:244', 'setSong from useGameStore', 'Destructured but never called in EditorScreen.'),
    ('DC-V05', 'editor-screen.tsx:282', 'incompleteSongs variable', 'Computed count but never displayed in UI.'),
    ('DC-V06', 'game-screen.tsx:326', 'timingOffset = 0', 'Dead constant, always 0. Comment: "user adjustable in future".'),
    ('DC-V07', 'player-progression.ts:332-358', '7 ExtendedPlayerStats fields', 'currentDailyStreak, longestDailyStreak, currentPlayStreak, longestPlayStreak, challengesCompleted, milestones.hundredSongs, milestones.thousandSongs - all permanently zero.'),
    ('DC-V08', 'shared-media-source.ts:21', 'connected boolean', 'Set in cache object but never read.'),
    ('DC-V09', 'leaderboard-service.ts:43', 'apiKey field', 'Private field set to null, no setter. X-API-Key header never sent.'),
    ('DC-V10', 'score-events-display.tsx:6', 'ScoreEvent.type field', 'Defined in interface but never consumed in rendering.'),
    ('DC-V11', 'game.ts:219-235', 'QueueItem export', 'Exported from game.ts but all consumers import from mobile-types.'),
    ('DC-V12', 'mobile-pitch-polling.ts:45', 'backoffTimer', 'Declared but never assigned. Cleanup always receives null.'),
]
issue_table(dead_vars)

story.append(Paragraph('<b>5.4 Unused Imports (16 items)</b>', h2_style))
dead_imports = [
    ('DC-I01', 'note-highway.tsx:4', 'PLAYER_COLORS', 'Imported from @/types/game, never referenced in file.'),
    ('DC-I02', 'game-enhancements.tsx:5', 'Badge', 'Imported from @/components/ui/badge, never used.'),
    ('DC-I03', 'pass-the-mic-screen.tsx:5', 'Song', 'Imported from @/types/game, never used.'),
    ('DC-I04', 'ptm-song-results.tsx:3', 'useRef', 'Imported from react, never used.'),
    ('DC-I05', 'medley-game-screen.tsx:16', 'MedleyPlayerRoundScore', 'Import type never referenced.'),
    ('DC-I06', 'medley-setup.tsx:9', 'PLAYER_COLORS (via import type)', 'Runtime value imported as type - erased.'),
    ('DC-I07', 'microphone-manager.ts:1', 'registerCleanup', 'Imported from app-cleanup, never called.'),
    ('DC-I08', 'tauri-file-storage.ts:6', 'readTextFile, exists', 'Imported from @tauri-apps/plugin-fs, never used.'),
    ('DC-I09', 'get-handlers.ts:2', '7 type imports', 'MobileClient, QueueItem, RemoteControlState, etc. - unused.'),
    ('DC-I10', 'player-progression.ts:142-163', '3 interfaces not exported', 'ChallengeMode, ChallengeModifier, ChallengeRequirement used by CHALLENGE_MODES but not exported.'),
    ('DC-I11', 'use-global-remote-control.ts:226', 'default export', 'Never consumed - all imports use named export.'),
    ('DC-I12', 'use-remote-control.ts:242', 'default export', 'Never consumed - all imports use named export.'),
    ('DC-I13', 'api/leaderboard-service.ts', 'apiKey class field', 'Declared but no setter exposed.'),
    ('DC-I14', 'types/youtube.d.ts:22-54', 'YTStatic, YTPlayerOptions', 'Only YTPlayer is imported externally.'),
]
issue_table(dead_imports)

# ━━ SECTION 6: RECOMMENDATIONS ━━
story.append(PageBreak())
story.append(Paragraph('<b>6. Improvement Recommendations</b>', h1_style))

story.append(Paragraph('<b>6.1 Priority Fix Order</b>', h2_style))
story.append(Paragraph(
    'Based on severity and blast radius, the recommended fix order is as follows. Critical and security '
    'issues should be addressed immediately. High severity issues should be fixed before any feature '
    'development. Medium issues can be tackled during a dedicated refactoring sprint. Low issues can be '
    'cleaned up incrementally during regular development.', body_style))

priority_data = [
    [Paragraph('<b>Priority</b>', header_cell), Paragraph('<b>Issues</b>', header_cell), Paragraph('<b>Count</b>', header_cell)],
    [Paragraph('P0 - Immediate', cell_left), Paragraph('SEC-01, SEC-02 (security vulnerabilities)', cell_left), Paragraph('2', cell_style)],
    [Paragraph('P1 - This Sprint', cell_left), Paragraph('LOG-01 through LOG-04 (critical logic errors)', cell_left), Paragraph('4', cell_style)],
    [Paragraph('P1 - This Sprint', cell_left), Paragraph('TYPE-01 through TYPE-03 (potential runtime crashes)', cell_left), Paragraph('3', cell_style)],
    [Paragraph('P2 - Next Sprint', cell_left), Paragraph('LOG-05 through LOG-21 (medium logic errors)', cell_left), Paragraph('17', cell_style)],
    [Paragraph('P2 - Next Sprint', cell_left), Paragraph('TYPE-04 through TYPE-11 (type safety gaps)', cell_left), Paragraph('8', cell_style)],
    [Paragraph('P3 - Refactoring', cell_left), Paragraph('ERR-01 through ERR-05 (error handling)', cell_left), Paragraph('5', cell_style)],
    [Paragraph('P3 - Refactoring', cell_left), Paragraph('DC-01 through DC-V14 (dead code removal)', cell_left), Paragraph('42', cell_style)],
    [Paragraph('P4 - Maintenance', cell_left), Paragraph('SM-01 through SM-62 (code quality)', cell_left), Paragraph('62', cell_style)],
]
cw2 = [AW*0.22, AW*0.68, AW*0.10]
t2 = Table(priority_data, colWidths=cw2, hAlign='CENTER')
s2 = [
    ('BACKGROUND', (0,0), (-1,0), ACCENT),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('GRID', (0,0), (-1,-1), 0.4, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]
for i in range(1, len(priority_data)):
    bg = colors.white if i % 2 == 1 else BG_SURFACE
    s2.append(('BACKGROUND', (0,i), (-1,i), bg))
t2.setStyle(TableStyle(s2))
story.append(Spacer(1, 10))
story.append(t2)

story.append(Paragraph('<b>6.2 Architectural Improvements</b>', h2_style))
story.append(Paragraph(
    'Beyond individual bug fixes, the review identified several recurring architectural patterns that '
    'would benefit from systematic improvement:', body_style))

recs = [
    ('Type Safety in Party Mode', 'The party mode system uses extensive type assertions (as any, as unknown as, non-null assertions) to bridge between unified party setup types and individual game mode types. Creating a proper type-safe adapter layer would eliminate most of the 15+ type safety issues in the party components. Consider using discriminated unions with a gameMode discriminator field to make type narrowing automatic.'),
    ('State Management Patterns', 'Several hooks use patterns that lead to stale closures or unnecessary re-renders: plain objects instead of useRef (use-song-library-sync.ts), nested setState calls (use-editor-history.ts), and entire store objects in dependency arrays (party-game-screens.tsx). Adopting consistent patterns: always use refs for values read in effects/callbacks, use functional updaters for state derived from previous state, and destructure only needed values from Zustand stores.'),
    ('Error Handling Strategy', 'The codebase has inconsistent error handling: some fetch calls have proper try/catch with logging, others silently swallow errors with empty catch blocks, and many API routes lack response.ok validation. Establishing a consistent error handling utility (e.g., a safeFetch wrapper that checks response.ok and throws typed errors) would reduce the 13+ missing error handling issues.'),
    ('JSON Validation', 'Multiple files call JSON.parse on stored data (localStorage, IndexedDB, API responses) without runtime validation. When the stored data is corrupted, from an older schema, or from an untrusted source, this produces silent data corruption. Adding a lightweight validation layer (e.g., zod schemas for stored data shapes) would catch these issues early.'),
    ('i18n Consistency', 'Several components have hardcoded German strings ("Nachstes Lied", "UNENTSCHIEDEN", "Werbung ueberspringen", editor metadata labels) while the rest of the UI uses an i18n translation system. These should be migrated to the translation system for consistency and internationalization support.'),
]
for title, desc in recs:
    story.append(Paragraph(f'<b>{title}</b>', h3_style))
    story.append(Paragraph(desc, body_style))

# ━━ BUILD ━━
doc.build(story)
print('Report generated successfully.')
