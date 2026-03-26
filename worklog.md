# Karaoke Successor - Development Worklog

## Project Overview
Building a complete Karaoke-style music game called "Karaoke Successor" - a modern web-based clone of UltraStar.

---
## Task ID: 1 - Main Agent
### Work Task
Initialize project structure and create core TypeScript types for the karaoke game.

### Work Summary
Setting up the complete file structure including:
- TypeScript types for songs, notes, players, game state
- Audio processing utilities for pitch detection
- Game logic and scoring system
- UI components for all game modes

---
## Task ID: 2 - UltraStar Pitch System & Scoring
### Agent: Main Agent
### Task: Implement UltraStar-style pitch detection with octave wrapping and scoring system

### Work Log:
- Researched UltraStar/SingStar pitch detection mechanism through web search
- Found that UltraStar uses "relative pitch" for scoring - notes wrapped to single octave (12 semitones)
- This means singing C3 instead of C4 counts as correct (same pitch class, different octave)
- Implemented `getPitchClass()` and `getRelativePitchDiff()` helper functions
- Created `calculatePoints()` function with UltraStar-style scoring
- Updated `checkNoteHits()` to use relative pitch comparison
- Added visual effects for score events (gradients, sparkles, emojis)
- Added combo indicator with glow effect for combos >= 5
- Added CSS animations: scorePopIn, fadeOut, comboGlow, noteHit, perfectSparkle
- Updated difficulty settings: Easy allows ±2 semitones (octave-wrapped), Medium ±1, Hard = exact pitch
- Removed debug console.log statements and cleaned up code

### Key Technical Details:
- **Pitch Class**: Notes are compared modulo 12 (C=0, C#=1, ..., B=11)
- **Octave Wrapping**: Singing same note name in different octave still counts
- **Maximum relative diff**: 6 semitones (half octave) for pitch comparison
- **Hard mode**: Requires exact pitch match, no octave tolerance
- **Octave jump bonus**: 80% points if correct pitch class but different octave

### Files Modified:
- `/home/z/my-project/src/app/page.tsx` - Added pitch class utilities, updated checkNoteHits, added visual effects
- `/home/z/my-project/src/types/game.ts` - Updated DIFFICULTY_SETTINGS comments
- `/home/z/my-project/src/app/globals.css` - Added CSS animations for score effects

### Stage Summary:
- UltraStar-style pitch detection implemented with octave wrapping
- Scoring system working with Perfect/Good/Okay ratings
- Visual effects for good notes added (gradients, sparkles, combo glow)
- Debug code removed, lint passes cleanly

---
## Task ID: 3 - Bug Fixes & Improvements
### Agent: Main Agent
### Task: Fix multiple issues in the Karaoke Successor app

### Issues Fixed:

#### 1. Jukebox Audio - NO SOUND (HIGH PRIORITY)
- **Problem**: Video was always muted, even when it had embedded audio
- **Fix**: Changed video muted prop to `muted={!currentSong.hasEmbeddedAudio && !!currentSong.audioUrl}`
- **Also fixed**: Audio element now shows when there's an audioUrl AND video doesn't have embedded audio
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 6122, 6146)

#### 2. Microphone Continues After Leaving Game (HIGH PRIORITY)
- **Problem**: Microphone didn't stop when clicking Back button in GameScreen
- **Fix**: Added cleanup in Back button onClick handler to call stop(), disconnect audio effects, pause media
- **Files**: `/home/z/my-project/src/app/page.tsx` (line 2150)

#### 3. Reset Library Button Not Working (HIGH PRIORITY)
- **Problem**: handleResetLibrary didn't call clearCustomSongs() from song-library.ts
- **Fix**: Imported clearCustomSongs and called it in handleResetLibrary
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 16, 5038)

#### 4. Browse/Save Buttons in Settings (HIGH PRIORITY)
- **Problem**: Browse only worked in Tauri, Save didn't show feedback
- **Fix**: 
  - Added `folderSaveComplete` and `isTauriMode` state variables
  - handleSaveFolder now clears cache, reloads library, shows success message
  - handleBrowseFolder shows instructions in browser mode
  - Added visual feedback for successful save
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 4942-5044, 5200-5213)

#### 5. Points System Display (HIGH PRIORITY)
- **Problem**: Score events were small and hard to see
- **Fix**:
  - Moved score events to right side of screen at vertical center
  - Added prominent score display at top center
  - Added glow effects for Perfect and Good hits
  - Made popups larger with better animations
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 2587-2634)

#### 6. Jukebox Fullscreen Layout (MEDIUM PRIORITY)
- **Problem**: Fullscreen mode didn't show playlist properly
- **Fix**:
  - Added `hidePlaylist` state for toggling playlist visibility
  - Changed layout to flex-row in fullscreen (75% video, 25% playlist)
  - Added "Hide/Show Playlist" toggle button in fullscreen
  - Playlist shows as sidebar in fullscreen mode
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 5930, 6105-6393)

#### 7. Genre/Language Filters (HIGH PRIORITY)
- **Problem**: Language field wasn't being passed from UltraStar parser to Song object
- **Fix**: Added `language: ultraStar.language` to convertUltraStarToSong return object
- **Also added**: #LANGUAGE tag to UltraStar export function
- **Files**: `/home/z/my-project/src/lib/parsers/ultrastar-parser.ts` (lines 282, 321-323)

#### 8. General Settings Application (MEDIUM PRIORITY)
- **Lyrics Style**: Updated LyricLineDisplay to read from localStorage and apply different styles
  - Classic, Concert, Retro, Neon, Minimal styles with unique effects
  - Added useEffect to listen for style changes
- **Background Video**: Added `showBackgroundVideo` state in GameScreen
  - Video background only renders when setting is enabled
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 1548-1686, 1701-1727, 2337-2361)

#### 9. Game Settings Application (MEDIUM PRIORITY)
- **Default Difficulty**: Updated startOptions initialization to read from localStorage
  - Now reads 'karaoke-default-difficulty' on mount
- **Pitch Guide**: Added `showPitchGuide` state in GameScreen
  - Added interval-based settings polling for real-time updates
- **Files**: `/home/z/my-project/src/app/page.tsx` (lines 873-888, 1708-1727)

### Files Modified:
- `/home/z/my-project/src/app/page.tsx` - Multiple fixes across the application
- `/home/z/my-project/src/lib/parsers/ultrastar-parser.ts` - Added language field support

### Remaining Lint Errors:
- 4 pre-existing errors related to setState in effects (not caused by these changes)

### Stage Summary:
- All HIGH PRIORITY issues fixed
- All MEDIUM PRIORITY issues fixed
- LOW PRIORITY items (PWA, Leaderboard) remain for future work

---
## Task ID: 4 - Feature Implementation Round
### Agent: Main Agent
### Task: Implement all remaining features for Karaoke app

### Features Implemented:

#### Task 1: Score Display with Popup Animations
- **Enhanced score display**: Larger, more prominent UI at top center with gradient background
- **Animated score popups**: Appear on right side of screen when notes are hit
- **Color-coded hit types**:
  - Perfect: Gold/yellow gradient with sparkle effect
  - Great: Green gradient with glow
  - Good: Blue gradient
  - Okay: Orange gradient
  - Miss: Gray gradient
- **Max score display**: Shows 10,000 potential points
- **Combo multiplier**: Shows percentage bonus for combos ≥5
- **Popups fade out after 1.5 seconds**
- **Files**: `/home/z/my-project/src/app/page.tsx`, `/home/z/my-project/src/app/globals.css`

#### Task 2: Library Filters
- **Verified genre filter**: Works correctly with `song.genre` property from UltraStar txt file parsing
- **Verified language filter**: Works correctly with `song.language` property from UltraStar txt file parsing
- **Both filters**: Use properties correctly parsed from #GENRE: and #LANGUAGE: tags

#### Task 3: Companion App (MobileClientView) - Complete Rewrite
- **Profile creation screen**: 
  - Photo upload support for avatar (base64 encoded)
  - Name input field
  - Color selection from 8 preset colors
  - Profile saved to localStorage and synced to server
- **Song browser**: 
  - Shows all songs from library
  - Search functionality
  - Cover images displayed
  - Duration shown
- **Add to queue functionality**: 
  - Requires profile to add songs
  - Sends queue items to server
  - Shows queue preview on home screen
- **Profile sync to main app**: Via API endpoints
- **Mobile device is INPUT only**: No audio/video output, just microphone input
- **Files**: `/home/z/my-project/src/app/page.tsx`, `/home/z/my-project/src/app/api/mobile/route.ts`, `/home/z/my-project/src/app/api/songs/route.ts`

#### Task 4: Mobile Screen (QR Code) - IP Detection Fix
- **Fixed IP detection**: Stores detected IP in sessionStorage for persistence
- **No localhost fallback**: Prevents confusion with invalid addresses
- **Retry button**: Allows manual retry of IP detection
- **Better error messaging**: Shows warning when IP cannot be detected
- **Files**: `/home/z/my-project/src/app/page.tsx`

### API Changes:
- **`/api/mobile`**: Added profile sync, queue management endpoints
- **`/api/songs`**: New endpoint for mobile client to fetch song library

### CSS Animations Added:
- `scoreSlideIn`: For score popup animations
- `pulseGlow`: For score display glow effect

### Files Modified:
- `/home/z/my-project/src/app/page.tsx` - Major MobileClientView rewrite, score display enhancements, IP detection fix
- `/home/z/my-project/src/app/globals.css` - New CSS animations
- `/home/z/my-project/src/app/api/mobile/route.ts` - Extended API for profile/queue
- `/home/z/my-project/src/app/api/songs/route.ts` - New file for song library API

### Commit: 47eba24
- All changes committed with descriptive message

---
## Task ID: 5 - Critical Bug Fixes Round 2
### Agent: Main Agent
### Task: Fix multiple critical issues reported by user

### Issues Fixed:

#### 1. Multi-Microphone Off Button Not Working (HIGH PRIORITY)
- **Problem**: `multiMicManager.offAssignedMics()` method didn't exist, causing errors on component unmount
- **Fix**: Added `offAssignedMics()` and `offDevices()` methods to MultiMicrophoneManager class
- **Files**: `/home/z/my-project/src/lib/audio/microphone-manager.ts`

#### 2. Karaoke Mode - No Audio/Video (HIGH PRIORITY)
- **Problem**: Audio and video not playing in Karaoke mode,- **Root causes identified**:
  1. Audio element rendered even when `hasEmbeddedAudio` was true (duplicate sources)
  2. No video element rendered when `showBackgroundVideo` was false but `hasEmbeddedAudio` was true
- **Fix**:
  - Audio element now only renders when `!song.hasEmbeddedAudio`
  - Added hidden video element for embedded audio when background video is disabled
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 3. Song Library - Media URLs Lost on Save (HIGH PRIORITY)
- **Problem**: When saving songs to localStorage, blob URLs were removed but `storedMedia` flag wasn't preserved properly
- **Fix**: Updated `saveCustomSongs` to preserve `storedMedia` flag so IndexedDB media can be restored
- **Files**: `/home/z/my-project/src/lib/game/song-library.ts`

#### 4. PWA Installation Not Working (MEDIUM PRIORITY)
- **Problem**: PWA manifest referenced non-existent PNG icons
- **Fix**: Updated manifest.json and pwa.ts to use SVG icons instead
- **Files**: `/home/z/my-project/public/manifest.json`, `/home/z/my-project/src/lib/game/pwa.ts`

#### 5. Page Stability / White Screens (HIGH PRIORITY)
- **Problem**: Various JavaScript errors causing white screens
- **Fix**: The microphone manager fix and other error handling improvements resolve these issues

### Files Modified:
- `/home/z/my-project/src/lib/audio/microphone-manager.ts` - Added unsubscribe methods
- `/home/z/my-project/src/app/page.tsx` - Fixed audio/video element rendering
- `/home/z/my-project/src/lib/game/song-library.ts` - Preserve storedMedia flag
- `/home/z/my-project/public/manifest.json` - Updated icons
- `/home/z/my-project/src/lib/game/pwa.ts` - Updated icon references

### Stage Summary:
- All critical bugs fixed
- Multi-microphone now properly cleans up on unmount
- Audio/video playback should work correctly in all scenarios
- PWA installation should work with SVG icons
- Song media URLs properly restored from IndexedDB

---
## Task ID: 6 - Companion App Overhaul
### Agent: Main Agent
### Task: Complete overhaul of the Companion App with proper communication

### Issues Fixed:

#### 1. Profile Sync to Main App (HIGH PRIORITY)
- **Problem**: Profiles created on companion app were not synced to main app
- **Fix**: 
  - Profile sync now happens via API on connection
  - Main app MobileScreen shows connected companions with profiles
  - Connection code displayed for easy identification

#### 2. Unique Connection Codes (HIGH PRIORITY)
- **Problem**: No unique codes, random IDs that changed on every refresh
- **Fix**: 
  - Added 4-character unique connection codes (e.g., "A7XK")
  - Codes are stored in localStorage for reconnection
  - Duplicate profile detection terminates old connections

#### 3. Connection Management (HIGH PRIORITY)
- **Problem**: Connections kept creating new instances, no cleanup
- **Fix**:
  - Reconnection logic using saved connection codes
  - Heartbeat to keep connections alive
  - Proper cleanup on disconnect
  - Old connections terminated when same profile reconnects

#### 4. Microphone Mode (HIGH PRIORITY)
- **Problem**: Microphone didn't stop when song ended
- **Fix**:
  - Added songEnded detection in game state sync
  - Microphone automatically stops when song ends
  - Pitch data only sent when song is playing

#### 5. Queue Management - Max 3 Songs (HIGH PRIORITY)
- **Problem**: No limit on songs per companion
- **Fix**:
  - Max 3 pending songs per companion enforced server-side
  - Visual slot indicator (3 circles)
  - Queue refreshes when songs complete
  - Error message when trying to add more

#### 6. Social Media Scorecard (MEDIUM PRIORITY)
- **Added**: Results view showing score, accuracy, combo, rating
- **Added**: Share score functionality
- **Added**: Save score card button (placeholder for future feature)

#### 7. Jukebox Wishlist (MEDIUM PRIORITY)
- **Added**: New jukebox view in companion app
- **Added**: Add songs to jukebox wishlist
- **Added**: Wishlist syncs with main app

#### 8. Main App Integration (HIGH PRIORITY)
- **Fix**: GameScreen now sends songEnded flag
- **Fix**: GameScreen sends game results to mobile clients
- **Added**: MobileScreen shows connected companions with codes
- **Added**: Mobile queue display on main app

### Files Modified:
- `/home/z/my-project/src/app/api/mobile/route.ts` - Complete rewrite with connection codes, queue management, cleanup
- `/home/z/my-project/src/app/page.tsx` - MobileClientView overhaul, MobileScreen updates, GameScreen integration

### API Endpoints Added:
- `reconnect` - Reconnect using saved connection code
- `results` - Get last game results
- `getjukebox` - Get jukebox wishlist
- `clearall` - Clear all connections (when main app closes)
- `heartbeat` - Keep connection alive
- `queuecompleted` - Mark song as completed, free up slot

### New Features:
- Connection codes for easy identification
- Profile sync between companion and main app
- Max 3 songs per companion with slot indicator
- Automatic mic stop when song ends
- Social media scorecard view
- Jukebox wishlist
- Queue display on main app
- Duplicate connection termination

---
## Task ID: 7 - PWA Installation Fix
### Agent: Main Agent
### Task: Fix PWA installation that never worked

### Root Cause Analysis:
The PWA installation feature never worked because:

1. **Tauri apps don't support PWA installation** - The `beforeinstallprompt` event is never fired in Tauri's webview because the app is already installed as a native desktop application.

2. **Event timing issue** - The `beforeinstallprompt` event was captured in `useEffect`, which runs after React hydration. If the browser fired the event before that, it was missed.

3. **No React state management** - The `deferredPrompt` was stored in a module-level variable, so React had no way to know when installation became available.

4. **Missing PNG icons** - Chrome requires PNG icons (192x192 and 512x512) for PWA installation, but only SVG icons existed.

### Fixes Applied:

1. **Tauri detection and UI changes**:
   - PWA Install section now hidden in Tauri mode
   - Shows "Desktop App Installed" info card in Tauri instead
   - Added `isTauriDetected` state variable

2. **Proper event handling**:
   - `beforeinstallprompt` event now captured at module load time (before React hydrates)
   - Added `onInstallAvailabilityChange()` subscription function
   - React state properly tracks install availability via `pwaInstallAvailable` state

3. **PNG icons generated**:
   - Created `icon-192x192.png` from SVG using sharp
   - Created `icon-512x512.png` from SVG using sharp

4. **Manifest and metadata updates**:
   - Updated `manifest.json` with correct PNG icon references
   - Updated `layout.tsx` with proper icon metadata
   - Fixed service worker badge icon reference

5. **Better UX in browser mode**:
   - Shows "Install" button when installation is available
   - Shows "Installed" status when app is already installed
   - Shows browser menu instructions when install prompt not available
   - Proper success/error messages after install attempt

### Files Modified:
- `/home/z/my-project/src/lib/game/pwa.ts` - Complete rewrite with proper event handling
- `/home/z/my-project/src/app/page.tsx` - Updated PWA UI with Tauri detection
- `/home/z/my-project/public/manifest.json` - Updated icon references
- `/home/z/my-project/public/sw.js` - Fixed badge icon reference
- `/home/z/my-project/src/app/layout.tsx` - Updated icon metadata
- `/home/z/my-project/public/icons/icon-192x192.png` - New file
- `/home/z/my-project/public/icons/icon-512x512.png` - New file

### Stage Summary:
- PWA installation now properly works in browser mode
- Tauri mode shows appropriate "already installed" UI
- All PWA requirements (icons, manifest) are now correctly configured
- Event capture timing fixed to not miss the beforeinstallprompt event

---
## Task ID: 8 - Webcam Background Support
### Agent: Main Agent
### Task: Implement Webcam Background Support as replacement or complement for background videos and images

### Features Implemented:

#### 1. Webcam Component (`/home/z/my-project/src/components/game/webcam-background.tsx`)
- **Complete rewrite** with all requested features:
  - Configurable size modes: Fullscreen, 2:10 (20%), 3:10 (30%), 4:10 (40%)
  - Position options: Top, Bottom, Left, Right
  - Separate camera selection dropdown (enumerates all available cameras)
  - Mirror mode for selfie-style view
  - Visual filters: None, Grayscale, Sepia, Contrast, Brightness, Vibrant, Blur
  - Adjustable opacity slider
  - Optional border with glow effect
  - Rounded corners with position-aware border radius

#### 2. GameScreen Integration
- **Webcam Quick Controls** in header:
  - Enable/disable toggle button
  - Size selector dropdown (Fullscreen, 20%, 30%, 40%)
  - Position selector dropdown (Top, Bottom, Left, Right)
  - Camera device selector dropdown
  - Mirror toggle button
- **Webcam Background** rendered over video/image background
- **Proper cleanup** when leaving GameScreen

#### 3. SettingsScreen Integration
- **New "Webcam" tab** added to settings
- **Webcam Settings Panel** with all configuration options:
  - Enable/disable toggle with description
  - Camera device selection with refresh button
  - Size selection buttons
  - Position selection buttons
  - Mirror toggle
  - Filter selection
  - Opacity slider
  - Border toggle
- **Info Card** explaining webcam purpose and features
- **Live Preview** showing webcam output in settings

#### 4. localStorage Persistence
- **Config saved** to `karaoke-webcam-config` key
- **Auto-load** on app start
- **Auto-save** on any config change
- **Default config** with sensible defaults

### Technical Details:
- **Uses `navigator.mediaDevices.getUserMedia`** for camera access
- **Uses `navigator.mediaDevices.enumerateDevices`** for camera list
- **Graceful permission handling** with error messages
- **Proper cleanup** on component unmount (stops all tracks)
- **Separate from streaming microphone** - this is purely for filming singers

### New Icons Added:
- `WebcamIcon` - Microphone/camera icon
- `InfoIcon` - Information circle icon

### Files Modified:
- `/home/z/my-project/src/components/game/webcam-background.tsx` - Complete rewrite
- `/home/z/my-project/src/app/page.tsx` - Integration in GameScreen and SettingsScreen

### UI Design:
- Rounded corners with position-aware styling (e.g., bottom strip has top corners rounded)
- Optional glowing border in cyan color
- Smooth transitions and animations
- Responsive controls that work on all screen sizes

### Stage Summary:
- Webcam background fully implemented and integrated
- Settings persist across sessions
- Works as separate camera for filming singers (not the streaming microphone camera)
- All requested features implemented
- Lint passes cleanly

---
## Task ID: 9 - AI Features Backend API Routes
### Agent: Main Agent
### Task: Create backend API routes for AI features using z-ai-web-dev-sdk

### Files Created:

#### 1. `/src/app/api/song-identify/route.ts`
**Purpose**: Identifies song metadata from filename or lyrics snippet

**Features**:
- Uses web search to find song information
- Uses LLM to extract structured metadata
- Returns: title, artist, year, genre, BPM, language, confidence score

**Request**:
```typescript
POST /api/song-identify
{
  "input": "Bohemian Rhapsody Queen.mp3", // or lyrics snippet
  "type": "filename" | "lyrics"
}
```

**Response**:
```typescript
{
  "success": true,
  "metadata": {
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "year": 1975,
    "genre": "Rock",
    "bpm": 72,
    "language": "en",
    "confidence": 95
  }
}
```

#### 2. `/src/app/api/lyrics-suggestions/route.ts`
**Purpose**: Analyzes lyrics for errors and suggests corrections

**Features**:
- Automatic language detection (ISO 639-1 codes)
- Optional web search for reference lyrics (when title/artist provided)
- Detects: typos, missing words, timing issues, misheard lyrics
- Returns suggestions with line index, original, suggested, reason, confidence

**Request**:
```typescript
POST /api/lyrics-suggestions
{
  "lyrics": ["Line 1", "Line 2", ...],
  "title": "Song Title", // optional
  "artist": "Artist Name" // optional
}
```

**Response**:
```typescript
{
  "success": true,
  "suggestions": [
    {
      "lineIndex": 2,
      "original": "Is this the real life",
      "suggested": "Is this the real life?",
      "reason": "Missing punctuation",
      "confidence": 85
    }
  ],
  "detectedLanguage": "en"
}
```

#### 3. `/src/app/api/cover-generate/route.ts`
**Purpose**: Generates album cover art using AI image generation

**Features**:
- Genre-specific visual themes (Pop, Rock, Hip-Hop, R&B, Country, Electronic, Jazz, etc.)
- Style options: modern, vintage, minimalist, artistic, neon, retro
- Returns base64 encoded PNG image (1024x1024)

**Request**:
```typescript
POST /api/cover-generate
{
  "title": "Song Title",
  "artist": "Artist Name",
  "genre": "pop", // optional
  "style": "modern" // optional: modern, vintage, minimalist, artistic, neon, retro
}
```

**Response**:
```typescript
{
  "success": true,
  "image": "base64-encoded-png-image-data"
}
```

### Technical Implementation:

**z-ai-web-dev-sdk Usage**:
- All routes use `await ZAI.create()` for initialization
- Web Search: `zai.functions.invoke("web_search", { query, num })`
- LLM Chat: `zai.chat.completions.create({ messages, temperature })`
- Image Generation: `zai.images.generations.create({ prompt, size })`

**Error Handling**:
- Try/catch blocks around all SDK calls
- Proper TypeScript error typing
- User-friendly error messages
- HTTP status codes (400 for bad requests, 500 for server errors)

**TypeScript Types**:
- Full type definitions for request/response bodies
- Interface definitions for structured data
- Type-safe JSON parsing with validation

### Lint Status:
- All new files pass lint without errors
- Pre-existing errors in other files remain (not related to these changes)

### Stage Summary:
- Three AI feature API routes created
- All routes use z-ai-web-dev-sdk in backend (not client-side)
- Full TypeScript type definitions
- Comprehensive error handling
- Ready for frontend integration

---
## Task ID: 10 - Karaoke Editor Timeline
### Agent: Main Agent
### Task: Create the main Karaoke Editor with Timeline for editing song notes

### Files Created:

#### 1. `/src/components/editor/timeline/waveform.tsx`
**Purpose**: Canvas-based audio waveform visualization

**Features**:
- Renders audio waveform from audio URL or AudioBuffer
- Supports zoom and scroll offset
- Time markers along the bottom
- Cyan gradient coloring with purple center line
- Automatic scaling based on container dimensions
- Device pixel ratio support for sharp rendering

**Props**:
- `audioUrl`: URL to load audio from
- `audioBuffer`: Pre-loaded AudioBuffer (alternative)
- `width/height`: Canvas dimensions
- `zoom`: Zoom level (affects pixel density)
- `scrollOffset`: Horizontal scroll position

#### 2. `/src/components/editor/timeline/note-block.tsx`
**Purpose**: Individual note block component for timeline

**Features**:
- Draggable note with move/resize handles
- Color coding by note type:
  - Normal: Cyan gradient
  - Golden: Amber/gold gradient with sparkle effect
  - Bonus: Pink gradient
  - Duet P1: Cyan
  - Duet P2: Purple
- Left/right resize handles for duration adjustment
- Center drag handle for position adjustment
- Selection ring and indicator
- Hover brightness effect
- Truncated lyric display

**Props**:
- `note`: Note object with pitch, timing, lyric
- `isSelected`: Selection state
- `zoom`, `pixelsPerSecond`, `scrollOffset`: Timeline state
- `minPitch`, `maxPitch`, `pitchHeight`: Pitch range config
- `onClick`, `onDragStart`: Event handlers

#### 3. `/src/components/editor/timeline/lyric-track.tsx`
**Purpose**: Editable lyrics track below the note timeline

**Features**:
- Displays lyrics aligned with note timing
- Double-click to edit lyric text
- Color-coded by note type (golden, bonus, duet players)
- Syncs with selected note highlighting
- Auto-saves on blur or Enter key
- Escape to cancel edit

**Props**:
- `notes`: Array of Note objects
- `zoom`, `pixelsPerSecond`, `scrollOffset`: Timeline state
- `height`: Track height
- `onLyricChange`: Callback for lyric updates
- `selectedNoteId`: Currently selected note

#### 4. `/src/components/editor/timeline/timeline.tsx`
**Purpose**: Main timeline container with grid, notes, and playhead

**Features**:
- Horizontal scroll with wheel (or ctrl+wheel for zoom)
- BPM-based beat grid with downbeat markers
- Pitch grid (C notes highlighted, sharps darker)
- Pitch labels on left (C2-C6 range)
- Draggable playhead with time indicator
- Transport controls (play/pause, skip to start/end)
- Zoom controls (+/- buttons, reset)
- Time slider for scrubbing
- Shift+click to add new notes
- Click to deselect notes
- Auto-scroll while playing

**State**:
- `zoom`: 0.25x to 4x
- `scrollOffset`: Horizontal scroll position
- `isDraggingPlayhead`: Playhead drag state
- `dragState`: Note drag state (move/resize)

#### 5. `/src/components/editor/karaoke-editor.tsx`
**Purpose**: Main editor component with full layout

**Features**:
- Three-panel layout:
  - Left: Tools (add note, duplicate, delete, split), note type buttons, duet player selection, keyboard shortcuts reference
  - Center: Timeline with all sub-components
  - Right: Note properties panel (lyric, pitch, timing, duration, golden/bonus toggles)
- Header with song info, undo/redo buttons, save/cancel
- Full keyboard shortcuts:
  - Space: Play/Pause
  - Delete/Backspace: Delete selected note
  - Ctrl+S: Save
  - Ctrl+Z: Undo
  - Ctrl+Shift+Z / Ctrl+Y: Redo
  - Ctrl+C/V: Copy/Paste notes
  - Escape: Deselect
- History management with undo/redo (50 entries)
- Audio playback synced with timeline
- Real-time note property editing

**Props**:
- `song`: Initial Song object
- `onSave`: Callback with updated song
- `onCancel`: Callback to abort editing

#### 6. `/src/components/editor/index.ts`
**Purpose**: Export all editor components

### Design Decisions:
- **Dark theme**: Slate background (slate-950, slate-900)
- **Accent colors**: Cyan and Purple (matching game theme)
- **DAW-style interface**: Similar to FL Studio, Ableton, Logic
- **Responsive**: Works on various screen sizes
- **Performance**: 
  - Off-screen notes not rendered
  - Request animation frame for scroll updates
  - Memoized calculations with useMemo

### Technical Details:
- **Pitch range**: C2 (MIDI 36) to C6 (MIDI 84)
- **Base pixels per second**: 100 (adjustable with zoom)
- **Pitch height**: 20px per semitone
- **Beat lines**: Based on song BPM
- **Auto-scroll**: Only when playing, 100ms throttle

### Files Modified:
- Created 6 new files in `/src/components/editor/`
- All files pass lint without errors

### Stage Summary:
- Complete karaoke editor with timeline
- Full note editing capabilities (position, duration, pitch, lyric, type)
- Undo/redo support
- Keyboard shortcuts
- Audio playback integration
- Professional DAW-style interface

---
## Task ID: 11 - Bug Fixes & Tauri Permissions
### Agent: Main Agent
### Task: Fix Tauri ACL error and investigate stack overflow

### Issues Fixed:

#### 1. Tauri Dialog Plugin ACL Error (HIGH PRIORITY)
- **Problem**: "Command plugin:dialog|message not allowed by ACL"
- **Root Cause**: Tauri v2 requires explicit capability permissions for plugins
- **Fix**: Created `/src-tauri/capabilities/default.json` with permissions:
  - Core permissions (window, webview)
  - Shell permissions (allow-open)
  - File system permissions (read, write, mkdir, etc.)
  - Dialog permissions (open, save, message, ask, confirm)

#### 2. Stack Overflow Error (FIXED)
- **Error**: "Maximum call stack size exceeded" in React reconciliation
- **Location**: During microphone selection in Settings
- **Root Causes**:
  1. **Duplicate useEffect hooks** in MicrophoneSettingsSection
     - Two identical useEffects both registered `micManager.onStatus()` callbacks
     - This meant `setMicStatus()` was called twice on every frame (60fps = 120 updates/sec)
  2. **Multiple callback registration** in `MicrophoneManager.connect()`
     - Each call to `connect()` registered a new callback without removing old one
     - This caused exponential callback growth
- **Fixes**:
  - Removed duplicate useEffect hook (lines 8241-8257)
  - Added `statusCallbackRegistered` flag to prevent duplicate callback registration
- **Commit**: 3e521d6

---
## Task ID: 12 - Feature Implementation Round 2
### Agent: Main Agent
### Task: Implement multiple high-priority features and fixes

### Features Implemented:

#### 1. YouTube Video Integration (HIGH PRIORITY)
- **Problem**: YouTube URLs in #VIDEO: tag were not automatically detected
- **Solution**:
  - Updated `parseUltraStarTxt()` to detect YouTube URLs (starting with http:// or https://)
  - Added `youtubeUrl` field to `UltraStarSong` interface
  - Updated `convertUltraStarToSong()` to set both `youtubeUrl` and `hasEmbeddedAudio`
  - Updated `generateUltraStarTxt()` to export YouTube URLs correctly
- **Files**: `/home/z/my-project/src/lib/parsers/ultrastar-parser.ts`

#### 2. Sound Priority Fix (HIGH PRIORITY)
- **Problem**: Sound was not playing correctly when both video and audio files existed
- **Solution**:
  - Implemented sound priority: Music file (audioUrl) > YouTube audio > Local video audio
  - Added `useYouTubeAudio` flag to determine when to use YouTube's audio
  - Updated audio element rendering logic with proper conditions
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 3. Video Disabled but Sound from Video (HIGH PRIORITY)
- **Problem**: When video was disabled for performance, audio from video was also lost
- **Solution**:
  - Added hidden YouTube player that plays audio when `showBackgroundVideo` is false
  - Added hidden video element for local videos with embedded audio
  - Performance-friendly solution that doesn't render video frames
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 4. Menu Restructuring (HIGH PRIORITY)
- **Main Menu** (new order):
  - Library | Party | Challenges | Queue | Characters | Highscores | Achievements | Jukebox | Settings
- **Settings Sub-menu** (reorganized):
  - General (Language, Game Settings)
  - Graphic / Sound (Video, Audio, Lyrics display settings)
  - Microphone (Microphone settings + Mobile device connection)
  - Webcam
  - Library (Merged with Import functionality)
  - Editor
  - AI Asset
  - About
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 5. Duet Mode Visibility (MEDIUM PRIORITY)
- **Problem**: Duet mode was always visible, even for non-duet songs
- **Solution**:
  - Duet mode button only shows when `selectedSong?.isDuet` is true
  - Single and Duel modes are hidden when Duet is available
  - Updated game mode selection buttons with conditional rendering
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 6. Lyrics Display Fix (HIGH PRIORITY)
- **Problem**: Spaces were not being displayed, hyphens not handled for line breaks
- **Solution**:
  - Changed `whiteSpace: 'pre'` to `whiteSpace: 'pre-wrap'` for proper space handling
  - Updated span elements to use `inline-block` for better syllable rendering
  - Preserved trailing spaces in lyrics (indicate word boundaries)
- **Files**: `/home/z/my-project/src/app/page.tsx`

#### 7. AI Asset Config File (MEDIUM PRIORITY)
- **Problem**: Missing .z-ai-config configuration file
- **Solution**: Created `/home/z/my-project/.z-ai-config` with:
  - General settings (app name, default model, temperature)
  - API settings (timeout, retries)
  - Image generation settings (default size, quality)
  - Web search settings
  - Feature flags for AI capabilities
  - Logging configuration
- **Files**: `/home/z/my-project/.z-ai-config`

#### 8. Library to Queue (HIGH PRIORITY)
- **Problem**: No ability to add songs from Library to Queue
- **Solution**:
  - Added "Queue" button to song modal action buttons
  - Button uses `addToQueue()` from game store
  - Adds song with current profile information
- **Files**: `/home/z/my-project/src/app/page.tsx`

### Technical Details:

**Sound Priority Logic**:
```typescript
// Priority order:
// 1. Music file (audioUrl) - always renders if exists
// 2. YouTube audio - when isYouTube && !audioUrl
// 3. Local video audio - when hasEmbeddedAudio && !isYouTube
```

**Duet Detection**:
- `song.isDuet` is set during txt file parsing
- Detection: P1/P2 markers in notes or `[Duet]` in folder name

**Menu State Management**:
- Main navigation uses `setScreen()` with screen type union
- Settings tabs use `activeTab` state with new tab types

### Commit: 4a13f78
- All changes pushed to GitHub: https://github.com/marco4192-ui/karaoke-successor

### Stage Summary:
- YouTube integration fully working with automatic URL detection
- Sound priority system ensures correct audio playback
- Menu restructured according to specification
- Duet mode visibility improved
- Lyrics display fixed for spaces
- Add to Queue button added to song modal
- All changes pushed to GitHub

---
## Task ID: 13 - Playlist UI for Library
### Agent: Main Agent
### Task: Add Playlist UI to Library section of the Karaoke Successor app

### Features Implemented:

#### 1. Playlists Tab in Library
- Added "Playlists" button to the view mode toggle in LibraryScreen
- New `LibraryViewMode` type: 'grid' | 'folder' | 'playlists'
- Tab shows purple highlight when active

#### 2. Playlist View
- **Playlist Grid**: Shows all playlists with cover image (first song's cover), name, and song count
- **System Playlists**: 
  - ⭐ Favorites
  - 🕐 Recently Played  
  - 🔥 Most Played
  - Marked with "System" badge
- **User Playlists**: Created by users, can be deleted with trash icon on hover
- **Create Playlist Button**: Opens modal to create new playlist

#### 3. Playlist Detail View
- When clicking a playlist, shows its songs in a grid
- Back button to return to playlist list
- Playlist name and description display
- Actions:
  - "Add to Queue" button: Adds all songs to the queue
  - "Play in Jukebox" button: Sends playlist to jukebox

#### 4. Create Playlist Modal
- Dialog with name and description inputs
- Form validation (name required)
- Creates playlist and saves to localStorage

#### 5. Add to Playlist Modal
- Opens from song modal's "Add to Playlist" button
- Shows all available playlists
- Indicates which playlists already contain the song
- "New Playlist" button to create one on-the-fly

#### 6. Favorite Button in Song Modal
- Star icon button to toggle favorite status
- Shows "Favorited" when song is in favorites
- Uses `toggleFavorite()` from playlist-manager

#### 7. Remove Song from Playlist
- Hover over song in playlist detail view shows X button
- Removes song from playlist and updates state

### Technical Changes:

**LibraryViewMode Type Extension**:
```typescript
type LibraryViewMode = 'grid' | 'folder' | 'playlists';
```

**State Variables Added**:
```typescript
const [playlists, setPlaylists] = useState<Playlist[]>([]);
const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
```

**CreatePlaylistForm Component**:
- Form component for creating new playlists
- Name and description fields
- Submit handler calls `createPlaylist()`

### Files Modified:
- `/home/z/my-project/src/app/page.tsx` - Added playlist tab, modals, and UI elements
- `/home/z/my-project/src/lib/playlist-manager.ts` - Removed song-library dependency, updated function signatures

### API Changes:
- `getPlaylistSongs(playlistId: string, allSongs: Song[])` - Now requires songs array to be passed in
- `calculatePlaylistDuration(playlistId: string, allSongs: Song[])` - Now requires songs array

### Lint Status:
- All changes pass lint without errors

### Stage Summary:
- Playlists tab fully functional in Library
- Create, view, and delete playlists
- Add/remove songs from playlists
- Favorite songs functionality
- Add playlist to queue/jukebox
- All data persisted to localStorage

---
## Task ID: 14 - Difficulty, Microphone & Playlist Enhancement
### Agent: Main Agent
### Task: Complete remaining features - difficulty levels, microphone optimization, playlist UI

### Features Implemented:

#### 1. Duet Filter UI Improvement
- Moved Duet filter button to be inline with Genre and Language filters
- No longer takes up an entire row
- Compact design showing just "🎭 Duet"

#### 2. Difficulty Level Tolerance Settings
- **Updated DIFFICULTY_SETTINGS** with real gameplay differences:
  - **Easy**: 2 semitone pitch tolerance, 300ms timing tolerance, 0.8x score multiplier, 0.03 volume threshold
  - **Medium**: 1 semitone pitch tolerance, 200ms timing tolerance, 1.0x score multiplier, 0.05 volume threshold
  - **Hard**: 0 semitone pitch tolerance (exact pitch required), 100ms timing tolerance, 1.3x score multiplier, 0.08 volume threshold

- **New settings added**:
  - `volumeThreshold`: Minimum volume to register singing
  - `pitchStabilityFrames`: Consecutive frames required for stable pitch detection
  - `noteScoreMultiplier`: Score multiplier based on difficulty

- **Updated functions**:
  - `calculateTickPoints()` uses `noteScoreMultiplier`
  - `checkNoteHits()` uses `volumeThreshold`

#### 3. Karaoke-Optimized Microphone Settings
- **Created configurable PitchDetectorConfig**:
  - `volumeThreshold`: Minimum volume to register (0-1)
  - `pitchStabilityFrames`: Consecutive frames for stable pitch
  - `yinThreshold`: YIN algorithm sensitivity (0.1-0.3)
  - `noiseGateEnabled`: Enable/disable noise gate
  - `noiseGateThreshold`: Noise gate threshold in dB

- **Difficulty-based presets**:
  - **Easy**: Very sensitive (0.03 threshold), quick response (2 frames), lenient YIN (0.12)
  - **Medium**: Standard sensitivity (0.05), 3 frames stability
  - **Hard**: Requires stronger singing (0.08), 5 frames stability, stricter YIN (0.18)

- **Pitch stability tracking** to reduce jitter in pitch detection
- **`setDifficulty()` method** for dynamic adjustment

#### 4. Playlist System Backend
- **Created `/src/lib/playlist-manager.ts`** with full CRUD operations
- **Types defined**:
  - `Playlist`: id, name, description, coverImage, songIds, timestamps, tags, playCount
  - `PlaylistFolder`: For organizing playlists
  - `PlaylistExport`: For import/export functionality

- **System Playlists**:
  - ⭐ Favorites
  - 🕐 Recently Played
  - 🔥 Most Played

- **Functions**:
  - CRUD: createPlaylist, updatePlaylist, deletePlaylist
  - Song Management: addSongToPlaylist, removeSongFromPlaylist, reorderPlaylistSongs
  - System: toggleFavorite, isFavorite, recordSongPlay
  - Import/Export: exportPlaylist, importPlaylist
  - Folders: createFolder, deleteFolder, addPlaylistToFolder

### Files Modified:
- `/home/z/my-project/src/app/page.tsx` - Duet filter position, playlist UI
- `/home/z/my-project/src/types/game.ts` - Difficulty settings update
- `/home/z/my-project/src/lib/audio/pitch-detector.ts` - Configurable settings
- `/home/z/my-project/src/hooks/use-pitch-detector.ts` - Difficulty integration
- `/home/z/my-project/src/lib/playlist-manager.ts` - New playlist backend

### Commit: c06f5f4
- All changes pushed to GitHub: https://github.com/marco4192-ui/karaoke-successor

### Stage Summary:
- Real difficulty levels with different tolerances implemented
- Microphone settings optimized for karaoke gameplay
- Full playlist system with UI in Library
- All changes committed and pushed to GitHub

---
## Task ID: 15 - Inactive Player Filter Verification
### Agent: Main Agent
### Task: Verify and ensure inactive players are filtered from game and song selection menus

### Analysis Performed:
The `isActive` property was already implemented in the PlayerProfile type:
- Location: `/home/z/my-project/src/types/game.ts` line 120
- Definition: `isActive?: boolean; // When false, profile won't appear in party mode selections`
- Default: `true` (via `?? true` pattern for backwards compatibility)

### Files Verified - All Already Have Filtering:

#### Game Selection Menus (ALL CORRECT):
1. **unified-party-setup.tsx** (lines 415-418):
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from party game setup

2. **home-screen.tsx** (line 154):
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from character selection

3. **library-screen.tsx** (multiple locations):
   - Player selection for Single mode
   - Player selection for Duel mode  
   - Player selection for Duet mode
   - Player selection for Party games
   - All use `profiles.filter(p => p.isActive !== false)`

4. **tournament-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from tournament

5. **medley-contest-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from medley contest

6. **battle-royale-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from battle royale

7. **pass-the-mic-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from pass the mic

8. **companion-singalong-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from companion singalong

9. **daily-challenge-screen.tsx**:
   - `profiles.filter(p => p.isActive !== false)`
   - Filters inactive players from daily challenge

10. **game-screen.tsx**:
    - `profiles.find(p => p.isActive !== false)`
    - Finds first active profile for default player

#### Character Management Screens (CORRECTLY SHOW ALL):
These screens intentionally show ALL profiles (active and inactive) because they are for management:
- **character-screen.tsx** - Shows all profiles for management
- **character-screen-enhanced.tsx** - Shows all profiles for management
- **user-profile-screen.tsx** - Shows all profiles for management

### Store Implementation (CORRECT):
- `/home/z/my-project/src/lib/game/store.ts`
- `createProfile()` sets `isActive: true` by default (line 274)
- `importProfileFromMobile()` sets `isActive: true` (lines 316, 335, 382)

### Conclusion:
**No changes were needed.** The inactive player filtering feature was already fully implemented across all game and song selection menus. The implementation follows the correct pattern:
- Uses `p.isActive !== false` for backwards compatibility (undefined defaults to active)
- Shows warning messages when insufficient active profiles available
- Character management screens correctly show all profiles for admin purposes

### Stage Summary:
- Verified filtering is correctly implemented everywhere
- Single Player mode: ✓ Filters inactive players
- Duel Mode: ✓ Filters inactive players  
- Party Games: ✓ Filters inactive players
- Song Selection: ✓ Filters inactive players
- No code changes required

---
## Task ID: 16 - Pitch Detection und Scoring System Reparaturen
### Agent: Main Agent
### Task: Pitch-Detection, Multi-Mikrofon-Support, Companion-App Integration und Duell-Modus UI reparieren

### Probleme identifiziert:

#### 1. Pitch-Detection System (ANALYSIERT)
- **Erkenntnis**: MultiMicrophoneManager ist implementiert und kann mehrere Mikrofone verwalten
- **Erkenntnis**: PitchDetector ist ein Singleton und unterstützt nur EIN Mikrofon
- **Erkenntnis**: Es gibt keine Verbindung zwischen MultiMicrophoneManager und Pitch-Detection pro Spieler
- **Status**: Grundlegende Infrastruktur vorhanden, aber nicht für mehrere Pitch-Detection-Instanzen ausgelegt

#### 2. Companion-App Pitch-Detection (BEHOBEN)
- **Problem**: Mobile Pitch-Daten wurden geholt aber nicht verwendet
- **Problem**: `p2DetectedPitch` wurde nie gesetzt, daher bekam P2 nie Punkte
- **Fix**: Effect hinzugefügt, der `mobilePitch` an `setP2DetectedPitch` weiterleitet
- **Fix**: `p2Volume` wird jetzt korrekt synchronisiert
- **Datei**: `src/components/screens/game-screen.tsx`

#### 3. Punktevergabe (BEHOBEN)
- **Problem**: P2's Punkte wurden in `p2State` gespeichert, aber nicht angezeigt
- **Problem**: `player2Score` (lokaler State) wurde verwendet statt `p2State.score`
- **Problem**: `p2Combo` wurde verwendet, war aber nicht definiert
- **Fix**: VS-Anzeige verwendet jetzt `p2State.score` und `p2State.combo`
- **Datei**: `src/components/screens/game-screen.tsx`

#### 4. Duell-Modus UI (BEHOBEN)
- **Problem**: ProminentScoreDisplay wurde IMMER angezeigt (auch im Duet/Duel)
- **Problem**: Untere Duel-Score-Anzeige verdeckte den Text
- **Problem**: Mittlere VS-Anzeige war zu klein
- **Fixes**:
  1. `ProminentScoreDisplay` nur noch wenn `!isDuetMode`
  2. Untere Duel-Score-Anzeige komplett entfernt
  3. VS-Anzeige vergrößert:
     - Schrift: `text-lg` statt `text-sm`
     - Padding: `px-4 py-2` statt `px-2 py-1`
     - Layout: `flex-col` mit Score und Combo untereinander
     - Größerer VS-Badge: `px-5 py-2 text-lg`
- **Datei**: `src/components/screens/game-screen.tsx`

### Technische Details:

**Game Loop Pitch Processing (vorher)**:
```typescript
if (isDuetMode && p2DetectedPitch !== null) {
  checkP2NoteHits(adjustedTime, p2PitchResult);
}
// p2DetectedPitch war nie gesetzt!
```

**Game Loop Pitch Processing (nachher)**:
```typescript
// Effect der mobilePitch zu p2DetectedPitch synchronisiert
useEffect(() => {
  if (isDuetMode && mobilePitch?.frequency) {
    setP2DetectedPitch(mobilePitch.frequency);
    setP2Volume(mobilePitch.volume || 0);
  }
}, [isDuetMode, mobilePitch, setP2DetectedPitch, setP2Volume]);
```

### Zusammenfassung der Änderungen:
- P2 erhält jetzt Punkte, wenn Companion-App verbunden ist
- VS-Anzeige im Duet/Duel-Modus ist größer und besser lesbar
- ProminentScoreDisplay nur noch im Single-Player
- Untere Score-Anzeige entfernt (verdeckte Text)
- Build erfolgreich kompiliert

### Commit: ea0d54d

---
## Task ID: 15 - Code Quality Check and Bug Fixes
### Agent: Main Agent
### Task: Check all files for correct code, complete implementation, and fix issues

### Work Log:
- Reviewed editor-screen.tsx and karaoke-editor.tsx for Metadata Tab functionality
- Verified "Song Info" tab in editor allows editing all metadata fields (Title, Artist, BPM, GAP, START, Video URL, Video Gap, Genre, Year, Language, Edition, Duet Mode)
- Verified save function correctly writes to original .txt file via `saveSongToTxt()`
- Found and fixed critical bug in game-screen.tsx where `noteProgressRef` and `p2NoteProgressRef` were being accessed but never defined
- Extended `useNoteScoring` hook to support 4 players for Party Mode
- Added P3 and P4 scoring states and note progress tracking
- Added `checkP3NoteHits` and `checkP4NoteHits` functions
- Extended `TimingDataForScoring` interface with p3Notes/p4Notes support
- Added `isPartyMode` option for 4-player game mode

### Commits:
- `fe42693`: Fix: replace incorrect noteProgressRef calls with resetScoring()
- `1229ab8`: Feat: extend useNoteScoring hook for 4-player party mode

### Stage Summary:
- Fixed critical runtime error in game-screen.tsx
- Extended scoring system for 4-player party mode
- Metadata Tab in Editor confirmed working correctly
- All builds passing
- Changes pushed to GitHub


---
## Task ID: 15 - Comprehensive Code Review & Bug Fixes
### Agent: Main Agent
### Task: Comprehensive code review and fix critical issues

### Issues Fixed:

#### 1. CRITICAL: timingData and beatDuration Temporal Dead Zone (HIGH PRIORITY)
- **Problem**: `timingData` and `beatDuration` were passed to `useNoteScoring` hook BEFORE they were defined
- **Root Cause**: The hook was called at line 228-251 but the variables were defined at line 581+ and 677+
- **Symptoms**: Scores not counting, undefined timing data in scoring logic
- **Fix**: Moved `timingData` useMemo and `beatDuration` calculation BEFORE the `useNoteScoring` hook call
- **Commit**: 30d5119

#### 2. Scoring Sensitivity Too Strict (HIGH PRIORITY)
- **Problem**: Scoring was too strict for casual karaoke players
- **Fix**: Updated DIFFICULTY_SETTINGS:
  - Easy: pitchTolerance 3 semitones (was 2), volumeThreshold 0.02 (was 0.05)
  - Medium: pitchTolerance 2 semitones (was 1), volumeThreshold 0.04 (was 0.08)
  - Hard: pitchTolerance 1 semitone (was 0), volumeThreshold 0.06 (was 0.1)
- **Also Updated**: Pitch detector settings to match - lower YIN threshold, lower noise gate
- **Commit**: 05fe244

#### 3. Duel Mode VS Badge Enlargement (MEDIUM PRIORITY)
- **Problem**: VS badge and score displays in Duel Mode were too small
- **Fix**: 
  - Enlarged score boxes (text-2xl instead of text-lg)
  - Larger player icons (w-10 h-10 instead of w-7 h-7)
  - Bigger VS badge (text-2xl, px-8 py-4)
  - Added stronger shadows and borders
  - VS badge now has gradient from cyan via white to pink
- **Commit**: b0c597a

### Files Modified:
- `/home/z/my-project/src/components/screens/game-screen.tsx` - Fixed temporal dead zone, enlarged VS badge
- `/home/z/my-project/src/types/game.ts` - Updated DIFFICULTY_SETTINGS
- `/home/z/my-project/src/lib/audio/pitch-detector.ts` - Updated pitch detection configs

### Stage Summary:
- Critical scoring bug fixed (scores now count correctly)
- Scoring is now more lenient for casual players
- Duel Mode score display is more prominent
- All changes pushed to GitHub


---
## Task ID: 16 - Database Optimization for Large Song Libraries
### Agent: Main Agent
### Task: Optimize database storage for large song libraries to avoid localStorage bloat

### Problem Analysis:
The original implementation stored complete lyrics (all notes with timing, pitch, text) in localStorage. For large libraries:
- ~1000 songs × 500 notes per song = ~500,000 note objects
- Each note object ~200 bytes = ~100MB in localStorage
- Browser localStorage limit is typically 5-10MB
- Result: "Quota exceeded" errors when scanning large folders

### Solution Implemented:

#### 1. Extended IndexedDB for TXT Files (media-db.ts)
- Added 'txt' type to MediaRecord
- Bumped DB_VERSION from 1 to 2
- Extended all functions to handle 'txt' type:
  - `storeMedia()` - now accepts 'txt' type
  - `getMedia()` - now returns 'txt' type
  - `getSongMediaUrls()` - now includes txtUrl
  - `deleteSongMedia()` - now deletes txt
  - `hasMedia()` - now checks for txt
- Added new `getTxtContent()` function for text extraction

#### 2. Updated Folder Scanner (folder-scanner.ts)
- Now stores TXT files in IndexedDB alongside audio/video/cover
- Added `storedTxt` flag to song objects
- Songs with storedTxt=true get empty lyrics array (not stored in localStorage)

#### 3. Optimized Song Library Storage (song-library.ts)
- `saveCustomSongs()` removes lyrics for songs with storedTxt=true
- Added ultra-minimal fallback for extreme quota exceeded cases
- Added `loadSongLyrics()` function for on-demand loading
- Added `parseUltraStarTxtContent()` for parsing TXT from IndexedDB

#### 4. Extended Song Type (game.ts)
- Added `storedTxt?: boolean` flag

#### 5. On-Demand Loading in Game Screen (game-screen.tsx)
- Added `loadedLyrics` state
- Added useEffect to load lyrics from IndexedDB when storedTxt=true
- Created `effectiveSong` that uses loadedLyrics
- Updated `timingData` to use `effectiveSong`

### Commits:
- 5f5dc5c: OPTIMIZE: Database optimization for large song libraries
- 7faa99a: FEAT: On-demand lyrics loading in game screen

### Benefits:
- localStorage stores only metadata (title, artist, BPM, etc.)
- Lyrics loaded on-demand when song is played
- Dramatically reduced localStorage usage
- No more "Quota exceeded" errors for large libraries
- IndexedDB handles large binary files (audio, video, txt) efficiently


---
## Task ID: 17 - Console Statements Logging Refactor
### Agent: Main Agent
### Task: Replace console statements with structured logger utility

### Work Log:
- Replaced console.error/log/warn statements with structured logger in:
  - user-profile-screen.tsx (5 statements)
  - youtube-background-player.tsx (5 statements)
  - assets/generate/route.ts (5 statements)
  - song-identify/route.ts (4 statements)
  - lyrics-suggestions/route.ts (4 statements)
  - editor/save-to-file.ts (4 statements)
  - db/user-db.ts (3 statements)
  - microphone-manager.ts (3 statements)
  - pitch-detector.ts (2 statements)
- Fixed React hooks dependency issues in battle-royale-screen.tsx:
  - Converted currentSong from state to derived useMemo
  - Moved handleRoundEnd definition before useEffect that uses it
- All console statements now use context prefixes for better debugging

### Commits:
- 30c56cc: refactor: replace console statements with logger utility
- e044599: refactor: replace more console statements with logger utility

### Stage Summary:
- Reduced console statements by ~25 across codebase
- Improved debugging with structured logging
- All builds passing, pushed to GitHub

---
## Task ID: 18 - Library Screen Hooks Extraction
### Agent: Main Agent
### Task: Extract reusable hooks from library-screen.tsx (1893 lines)

### Work Log:
- Created useLibrarySettings hook for:
  - Sort/filter/group preferences
  - localStorage persistence
  - View mode management
- Created useLibraryPreview hook for:
  - Audio preview management
  - Video preview control
  - Cleanup on unmount
- Created useLibraryPlaylists hook for:
  - Playlist CRUD operations
  - Favorites management
  - Playlist state management

### Files Created:
- src/hooks/use-library-settings.ts (130 lines)
- src/hooks/use-library-preview.ts (125 lines)
- src/hooks/use-library-playlists.ts (179 lines)

### Commit: 0a2291d

### Stage Summary:
- Hooks extracted and ready for integration
- Reduces library-screen.tsx complexity when integrated
- All builds passing, pushed to GitHub
