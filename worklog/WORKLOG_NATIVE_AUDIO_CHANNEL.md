# Worklog: NativeAudio ACL-Fehlerbehebung – Channel IPC Migration

## Problem
`[NativeAudio] Could not register time-update listener (non-fatal): Command plugin:event|listen not allowed by ACL`
- Tauri v2 ACL blockiert `plugin:event|listen`
- `onAudioTimeUpdate()` und `onAudioEnded()` nutzen `listen()` von `@tauri-apps/api/event`
- Die App funktioniert per Polling-Fallback, aber es gibt keine Echtzeit-Positionsupdates

## Lösung
Migration von `app_handle.emit()` + `listen()` zum Tauri Channel IPC Pattern
(bereits erfolgreich in `analysis_commands.rs` verwendet).

## Referenz: analysis_commands.rs Channel-Pattern
- Rust: `Channel<T>` als Parameter im `#[tauri::command]`
- Frontend: `new Channel<T>()` mit `onmessage` Callback
- Channels werden über den Command-Aufruf übergeben, kein ACL-Problem

---

## Task 1: Repository klonen und Codebase analysieren ✅
- Repository geklont nach `/home/z/my-project/karaoke-successor`
- Alle relevanten Dateien analysiert:
  - `src-tauri/src/audio/commands.rs` (Rust Backend, emit-basiert)
  - `src-tauri/src/audio/analysis_commands.rs` (Referenz für Channel-Pattern)
  - `src-tauri/src/audio/player.rs` (NativeAudioPlayer, PlaybackState)
  - `src-tauri/src/lib.rs` (AudioState Setup)
  - `src-tauri/capabilities/default.json` (ACL-Konfiguration)
  - `src/lib/audio/native-audio.ts` (Frontend API, listen-basiert)
  - `src/hooks/use-native-audio.ts` (React Hook, Event-Listener)
  - `src/hooks/use-game-loop.ts` (Verbraucher von useNativeAudio)

## Task 2: Rust Backend (commands.rs) – Channel IPC ✅
**Datei:** `src-tauri/src/audio/commands.rs`
- `Emitter` Trait Import entfernt, `Channel` aus `tauri::ipc` importiert
- `AudioCommand::Play` um drei Channel-Parameter erweitert:
  - `on_time_update: Channel<u64>` (Positionsupdates ~20Hz)
  - `on_ended: Channel<()>` (Playback-Ende)
  - `on_error: Channel<String>` (Fehlermeldungen)
- `run_audio_thread()` Signatur vereinfacht: `AppHandle` Parameter entfernt
- Audio-Thread speichert Channels in `Option<Channel<T>>` Variablen
- `app_handle.emit()` durch `channel.send()` ersetzt:
  - Zeile 124: `app_handle.emit("audio:time-update", ...)` → `ch.send(state.position_ms)`
  - Zeile 134: `app_handle.emit("audio:ended", ...)` → `ch.send(())`
  - Zeile 91: `app_handle.emit("audio:error", ...)` → `ch.send(e.to_string())`
- Channels werden bei Stop/Shutdown/Ended sauber auf `None` gesetzt
- `audio_play_file` Command um drei Channel-Parameter erweitert

**Datei:** `src-tauri/src/lib.rs`
- `AudioState::new(app.handle().clone())` → `AudioState::new()`

## Task 3: Frontend native-audio.ts – Channel API ✅
**Datei:** `src/lib/audio/native-audio.ts`
- `listen` und `UnlistenFn` Import aus `@tauri-apps/api/event` entfernt
- `Channel` Import aus `@tauri-apps/api/core` hinzugefügt
- `AudioEventCallbacks` Interface mit optionalen Callbacks definiert
- `onAudioTimeUpdate()` und `onAudioEnded()` Funktionen entfernt
- `playAudioFile()` Signatur erweitert: optionaler `callbacks?: AudioEventCallbacks`
- Channels werden in `playAudioFile()` erstellt und an invoke übergeben

## Task 4: Frontend use-native-audio.ts – Hook Migration ✅
**Datei:** `src/hooks/use-native-audio.ts`
- `onAudioTimeUpdate` und `onAudioEnded` Importe entfernt
- `unlistenTimeRef` und `unlistenEndedRef` entfernt
- Ganzer `useEffect` für Event-Listener Setup/Teardown entfernt (~45 Zeilen)
- `mountedRef` und `playGenRef` hinzugefügt (Stale-Callback-Schutz)
- `play()` Callback erstellt Channel-Callbacks inline via `playAudioFile()`
- Generation-Check in allen Channel-Callbacks: `if (playGenRef.current !== gen) return`

## Task 5: Commit & Push ✅
- Commit: `9460ea3 fix(audio): migrate NativeAudio from emit/listen to Tauri Channel IPC`
- Push: `cceadd7..9460ea3  master -> master`

---

## Verifikung
- ✅ Keine verbleibenden Referenzen auf `onAudioTimeUpdate` oder `onAudioEnded` im Codebase
- ✅ Keine verbleibenden `app_handle.emit()` Aufrufe im Audio-Modul
- ✅ `Emitter` Trait nicht mehr importiert
- ✅ `useNativeAudio` Hook-Interface unverändert (nur interne Implementierung geändert)
- ✅ `use-game-loop.ts` nicht berührt (nutzt nur Hook-Rückgabewerte)
- ✅ Pattern konsistent mit `analysis_commands.rs`
