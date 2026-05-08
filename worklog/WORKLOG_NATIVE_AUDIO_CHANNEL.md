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

## Tasks
