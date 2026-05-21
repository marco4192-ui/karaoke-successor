# Jukebox — Ausführliche Analyse

> Erstellt: 2026-05-21
> Status: **UMGESETZT** — Alle 56 Items implementiert
> analysierte Dateien: 10 Core + 12 Integration + 16+ i18n
> Commit: `560586c` — 173 Dateien geändert, 1394+ insertions

---

## Architektur-Übersicht

Die Jukebox-Funktion ist ein Musik-Player-Modus der Karaoke-App, der es erlaubt, aus der Song-Bibliothek eine Playlist zu generieren und automatisch abspielen zu lassen — ideal für Pausen oder als Hintergrundmusik auf Partys. Die Architektur folgt einem sauberen Hook-driven Pattern:

- **`useJukebox()`** — Zentraler Hook, kapselt alle State, Logik, Polling, Playback-Steuerung
- **`JukeboxSetupView`** — Pre-Play Konfiguration (Filter, Shuffle, Repeat, YouTube-URL)
- **`JukeboxPlayerView`** — Aktiver Player mit Video, Lyrics-Overlay, Controls, Playlist-Sidebar
- **`JukeboxScreen`** — Top-Level Container, reicht Refs durch
- **Companion-Integration** — Mobile Clients können per Wishlist Songs in die Jukebox einreihen
- **Playlist aus Bibliothek** — Speicherte Song-IDs im localStorage für schnellen Jukebox-Start

---

## 🔴 Kritische Bugs

| # | Datei | Problem | Schweregrad |
|---|-------|---------|-------------|
| 1 | `use-jukebox.ts` Z.107-135 | **Wishlist-Songs werden beim `generatePlaylist()` nicht als "manual" markiert** — In `generatePlaylist()` werden Wishlist-Songs gefunden und in die Playlist eingefügt, aber `manualIdsRef.current.add(fullSong.id)` wird nur bei neuem Song gemacht, nicht bei bereits existierenden Songs im Pool. Wenn ein Wishlist-Song zufällig bereits im gefilterten Pool ist, wird er **nicht** als manuell markiert, kann aber doppelt auftreten (einmal als Zufalls-Pick, einmal als Wishlist-Insert). Das `wishlistSongIds`-Dedup sollte dies verhindern, aber die `manualIdsRef`-Markierung fehlt für den Fall, dass der Song im Random-Pool bleibt. | Hoch |
| 2 | `use-jukebox.ts` Z.208-207 | **Polling-Effect hat `songs.length` als Dependency statt `songs`** — `songsRef.current = songs` wird zwar korrekt gesetzt, aber der Effect hängt nur von `songs.length` ab. Wenn sich ein Song ändert (z.B. URLs restauriert), wird der Polling-Effect nicht neu gestartet. Praktisch kein Problem da Song-Objekte sich nach Laden nicht ändern, aber inkorrekt semantisch. | Niedrig |
| 3 | `jukebox-player-view.tsx` Z.188-194 | **`handleSongClick` lädt Song asynchron ohne Loading-State oder Error-Handling** — Wenn `getSongByIdWithLyrics` oder `ensureSongUrls` fehlschlägt, wird der Click ignoriert und kein Feedback gegeben. Der Nutzer klickt auf einen Song in der Playlist und nichts passiert. | Mittel |
| 4 | `use-jukebox.ts` Z.347-359 | **Auto-play hat hartcodiertes 100ms Timeout** — Das `setTimeout(100)` für Auto-play nach Song-Wechsel ist eine fragile Race Condition. Bei langsamen Geräten oder wenn der Video/Audio-Player noch nicht gemountet ist, kann das Play-Pending verloren gehen. YouTube-Player laden oft >300ms. | Mittel |
| 5 | `use-jukebox.ts` Z.258-261 | **`startJukebox()` ist async aber Fehler werden nicht abgefangen** — `generatePlaylist()` kann fehlschlagen (z.B. wenn `prepareSong` fehlschlägt), dann wird `setIsPlaying(true)` trotzdem aufgerufen → leere Playlist im Playing-Modus. | Mittel |
| 6 | `jukebox-player-view.tsx` Z.299-381 | **IIFE inside JSX (`(() => { ... })()`) zur Bedingung** — Das currentSong-Check nutzt ein Immediately Invoked Function Expression im JSX-Return. Das ist schwer lesbar und wird von React DevTools nicht gut dargestellt. Sollte in eine eigene Komponente oder Variable extrahiert werden. | Niedrig |
| 7 | `jukebox-setup-view.tsx` | **Doppelte Filter-Controls** — Genre-Filter und Artist-Filter erscheinen ZWEIMAL: Einmal oben in der "Search and Filters"-Sektion (Z.57-91) und einmal unten in der "Playlist Settings" Card (Z.116-144). Beide steuern denselben State (`j.filterGenre`, `j.filterArtist`). Das ist redundant und verwirrend. | Mittel |
| 8 | `jukebox-setup-view.tsx` | **Doppelter "Start Jukebox" Button** — Einmal oben (Z.96-102) neben dem Song-Count und einmal unten (Z.211-217) als großer Gradient-Button. Beide haben identische Funktion. Redundant. | Niedrig |
| 9 | `post-handlers.ts` Z.513-535 | **`jukebox_wishlist_remove` setzt Status 401 statt 403 bei fehlendem clientId** — Z.516 nutzt `{ status: 401 }` für "Not connected", aber es ist eher ein 403 (Forbidden) da es keine Auth-Frage ist sondern eine fehlende Client-Session. | Niedrig |
| 10 | `use-jukebox.ts` Z.228-237 | **`playPrevious` wrapped bei Index -1 zum ENDE der Playlist** — Wenn man beim ersten Song auf "Zurück" drückt, springt man zum letzten Song. Das ist unerwartet — die meisten Player stoppen oder bleiben am Anfang. | Niedrig |

---

## 🟠 Mittlere Probleme (UX/Logik)

| # | Datei | Problem | Schweregrad |
|---|-------|---------|-------------|
| 11 | `use-jukebox.ts` | **Kein Fortschrittsbalken / Seek-Bar** — Weder für YouTube noch für Audio/Video gibt es eine Fortschrittsanzeige oder Möglichkeit zu spulen. Der Nutzer sieht nicht, wie weit der Song ist und kann nicht zu einer bestimmten Stelle springen. | Hoch (UX) |
| 12 | `use-jukebox.ts` | **Kein Song-Duration-Tracking** — Die aktuelle Wiedergabezeit wird nicht getrackt (außer `youtubeTime` für YouTube). Für lokale Audio/Video gibt es kein Zeit-Tracking. | Hoch (UX) |
| 13 | `jukebox-player-view.tsx` | **Volume-Slider nur als Slider, kein Mute-Button** — Es gibt keinen Mute-Button. Der Slider geht auf 0 aber das ist kein Mute (erinnert sich nicht an vorherige Lautstärke). | Mittel |
| 14 | `jukebox-player-view.tsx` Z.248-266 | **Volume-Slider wird doppelt gerendert** — Einmal in der `ControlsBar` (Z.168-173, normaler Modus) und einmal in der `PlaylistSidebar` Fullscreen-Sektion (Z.255-259). Beide steuern `j.volume`. | Niedrig |
| 15 | `use-jukebox.ts` Z.95-145 | **Wishlist-Integration ist dupliziert** — Die Wishlist wird sowohl in `generatePlaylist()` (Z.107-135) als auch im separaten Polling-Effect (Z.176-207) abgerufen. Bei jedem `generatePlaylist()` Aufruf wird die Wishlist extra gefetchet, obwohl der Polling-Effect bereits läuft. Das kann zu Race Conditions führen. | Mittel |
| 16 | `mobile-jukebox-view.tsx` Z.55-57 | **`useCallback` innerhalb von `.map()` ohne korrekte Dependencies** — `handleSwipeLeft` wird in jedem Render neu erstellt weil `handleRemove` und `item` in der Closure sind, aber `useCallback` hat nur `[item]` als Dependency. `handleRemove` ist nicht stabil. | Niedrig |
| 17 | `use-jukebox.ts` | **`shuffle` toggelt nur bei Generierung, nicht live** — Wenn man Shuffle während der Wiedergabe toggelt, ändert sich die aktuelle Playlist nicht. Erst beim nächsten `startJukebox()` wird neu gemischt. Das ist inkonsistent mit der UI, die Shuffle als Toggle-Button darstellt. | Mittel |
| 18 | `use-jukebox.ts` Z.297-306 | **`togglePlayPause` steuert video UND audio gleichzeitig** — Wenn ein Song sowohl Video als auch separate Audio-Datei hat, werden beide gestartet/gestoppt. Das ist nur korrekt, wenn genau eines von beiden aktiv ist. Bei `hasEmbeddedAudio`-Songs hat das Video eingebettetes Audio → Audio-Track stört nicht. Aber bei fehlerhaften Song-Daten könnten beide abspielen. | Mittel |
| 19 | `jukebox-player-view.tsx` | **Keine Song-Transition-Animation** — Wenn ein Song endet und der nächste beginnt, gibt es keinen visuellen Übergang. Das Video springt hart, der Title ändert sich sofort. | Niedrig |
| 20 | `jukebox-player-view.tsx` Z.28 | **`.slice(2)` auf Lyrics-Label** — `t('jukeboxPlayer.lyrics').slice(2)` schneidet die ersten 2 Zeichen (vermutlich "🎤 ") vom Lyrics-Label ab. Wenn die i18n-Übersetzung kein Emoji hat, werden sinnvolle Zeichen abgeschnitten. | Mittel |

---

## 🟡 Code-Qualität & Wartbarkeit

| # | Datei | Problem |
|---|-------|---------|
| 21 | `jukebox-setup-view.tsx` | **Inline SVGs dupliziert** — Das Chevron-Down SVG für Select-Dropdowns wird dreimal inline wiederholt (Z.62, Z.73, implizit via backgroundImage). Sollte als Komponente oder Icon ausgelagert werden. |
| 22 | `jukebox-player-view.tsx` | **Große Komponente (~390 Zeilen)** — Die gesamte Player-View ist in einer einzigen Datei mit 5 Sub-Komponenten. `LyricsOverlay`, `VideoOverlay`, `ControlsBar`, `PlaylistSidebar` und `FullscreenHeader` sollten in eigene Dateien ausgelagert werden. |
| 23 | `use-jukebox.ts` | **~413 Zeilen Hook** — Der Hook ist sehr groß und deckt viele Verantwortlichkeiten ab: Playlist-Generierung, Playback-Steuerung, Wishlist-Polling, YouTube-Handling, Lyrics-Tracking, Fullscreen-Management. Sollte in kleinere Hooks aufgeteilt werden (z.B. `useJukeboxPlaylist`, `useJukeboxPlayback`, `useJukeboxWishlist`). |
| 24 | `jukebox-player-view.tsx` Z.240 | **Dauer-Formatierung inline** — `Math.floor(song.duration / 60000)` und String-Padding werden inline gemacht statt als Utility-Funktion (`formatDuration` ist bereits in `use-mobile-data.ts` definiert). |
| 25 | `use-jukebox.ts` Z.135 | **Empty catch-Block** — `catch { /* ignore */ }` bei Wishlist-Fetch in `generatePlaylist()` schluckt Fehler komplett. Sollte zumindest `console.debug` loggen. |
| 26 | `jukebox-player-view.tsx` Z.306-329 | **YouTube-Player Props teilweise redundant** — `customYoutubeId` und `song.youtubeUrl` beide rendern `YouTubePlayer` mit fast identischen Props. Sollte ein einheitlicher `videoId` berechnet und ein einzelner YouTube-Player gerendert werden. |
| 27 | `jukebox-types.ts` | **`UseJukeboxReturn` Interface ist sehr breit** — 37 Properties/Setters/Actions. Das macht Refactoring und Testing schwer. Sollte in Sub-Interfaces aufgeteilt werden. |

---

## 🔵 Fehlende Features & Verbesserungspotenziale

| # | Feature | Beschreibung | Priorität |
|---|---------|-------------|-----------|
| F1 | **Fortschrittsbalken / Seek-Bar** | Aktueller Song-Fortschritt als Balken + Möglichkeit zum Spulen (Seek). Für YouTube-Player ist `seekTo()` verfügbar, für Audio/Video nativ `currentTime`. | Hoch |
| F2 | **Aktuelle Zeit / Gesamtdauer Anzeige** | Anzeige "2:34 / 4:12" neben dem Fortschrittsbalken. | Hoch |
| F3 | **Mute-Toggle Button** | Lautsprecher-Icon das auf Klick stumm schaltet und bei erneutem Klick zur vorherigen Lautstärke zurückkehrt. | Mittel |
| F4 | **Song-Skip-Geste** — Swipe-Right zum nächsten Song auf dem Video-Player (Touch-Geräte). | Mittel |
| F5 | **Energie-Sparende Optimierung** — Wenn der Tab nicht sichtbar ist (`document.hidden`), Playback-Rate reduzieren oder pausieren. | Mittel |
| F6 | **Favoriten / Liked Songs in Jukebox** — Möglichkeit, nur favorisierte Songs in die Jukebox aufzunehmen. | Mittel |
| F7 | **"Recently Played" Ausschluss** — Songs die in den letzten X Minuten gespielt wurden, nicht wieder in die Random-Playlist aufnehmen. | Mittel |
| F8 | **Playlist-Persistierung** — Gespeicherte Playlist-IDs (aus Bibliothek) werden im `JUKEBOX_PLAYLIST` Storage-Key abgelegt, aber `useJukebox` liest diese nie! Die Funktion existiert in `playlist-view.tsx` aber wird nicht im Hook genutzt. | Hoch |
| F9 | **Crossfade-Übergang** — Sanftes Überblenden zwischen Songs (2-3 Sekunden Fade-Out/Fade-In). | Niedrig |
| F10 | **Song-Anzahl limitieren** — Möglichkeit, die Playlist auf N Songs zu begrenzen ("Spiele 20 Songs dann stopp"). | Mittel |
| F11 | **Song-Dauer-Filter** — Nur Songs unter/über X Minuten in die Jukebox aufnehmen. | Niedrig |
| F12 | **Genre-Gewichtung** — Gewichtung pro Genre einstellen (z.B. 40% Pop, 30% Rock, 30% Ballads). | Niedrig |
| F13 | **Wishlist-Priorisierung可视** — In der Playlist-Sidebar markieren welche Songs von welchem Companion gewünscht wurden. | Mittel |
| F14 | **Now-Playing Info im Companion** — Der Mobile Home-View zeigt den aktuellen GameState, aber wenn die Jukebox läuft, gibt es kein spezielles "Jukebox Now Playing" Widget mit Cover, Song-Info, Up-Next. | Mittel |
| F15 | **Companion Jukebox-Steuerung** — Play/Pause/Next/Previous aus der Companion App (Remote-Steuerung für Jukebox). | Hoch |
| F16 | **Wishlist-Notification** — Toast-Benachrichtigung auf dem Desktop wenn ein Companion einen Song zur Wishlist hinzufügt ("XY möchte 'Song' hören"). | Mittel |
| F17 | **Automatischer Start bei leerer Queue** — Option: Wenn die Karaoke-Queue leer ist, automatisch die Jukebox starten. | Niedrig |
| F18 | **Equalizer-Visualisierung** — Audio-Visualisierung als Background-Effekt im Player. | Niedrig |
| F19 | **Song-Cover-Download fehlt** — `JukeboxWishlistItem` in `mobile-types.ts` hat kein `coverImage` Feld. Die mobile Wishlist-Ansicht zeigt kein Cover an. | Niedrig |

---

## 💡 Neue Feature-Ideen

| # | Idee | Beschreibung | Aufwand |
|---|------|-------------|---------|
| N1 | **Kollaborative Jukebox (Multi-Companion)** — Mehrere Companion-Apps können Songs zur Wishlist hinzufügen. Die Jukebox mischt alle Wünsche und verteilt sie fair (Round-Robin pro Companion). | Mittel |
| N2 | **Mood-Playlist-Templates** — Vordefinierte Stimmungen: "Party Bangers", "Chill Vibes", "Power Ballads", "90s Nostalgie", "Duett-Abend". Wählt automatisch Genre/BPM/Difficulty-Filter. | Mittel |
| N3 | **"Song des Abends" Vote** — Companion-Nutzer können für einen "Song des Abends" abstimmen. Der Song mit den meisten Votes wird als nächstes gespielt. | Mittel |
| N4 | **Jukebox-Timer** — Automatisch stoppen nach X Minuten/Stunden ("Spielt noch 30 Minuten"). Ideal als Background-Musik mit zeitlicher Begrenzung. | Niedrig |
| N5 | **Dedicated Now-Playing Screen** — Ein vollbildschirm Now-Playing View mit großem Cover, animiertem Hintergrund, Lyrics-Karaoke-Style und Song-Info. Ähnlich wie Spotify/Apple Music Fullscreen. | Hoch |
| N6 | **Intelligent Shuffle (AI-basiert)** — Statt purem Random: Songs die zum aktuellen passen (Genre, BPM, Energy-Level). Smooth Transitions statt wilder Sprünge. | Hoch |
| N7 | **Jukebox-Queue Drag & Drop** — Auf dem Desktop: Songs in der Playlist per Drag & Drop umsortieren. | Niedrig |
| N8 | **"Nächster Song ist von..." Anzeige** — Vor dem nächsten Song ein 3-Sekunden-Overlay "Nächster Wunsch von Max: Bohemian Rhapsody". | Niedrig |
| N9 | **Jukebox-Statistiken** — Wie viele Songs gespielt, welche Genre am beliebtesten, welcher Companion am meisten gewünscht hat. | Mittel |
| N10 | **Import/Export Playlist** — Jukebox-Playlist als JSON/CSV exportieren und importieren. Teilbar mit anderen Party-Gästen. | Niedrig |

---

## Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| 🔴 Kritische Bugs | 10 |
| 🟠 Mittlere Probleme | 10 |
| 🟡 Code-Qualität | 7 |
| 🔵 Fehlende Features | 19 |
| 💡 Neue Ideen | 10 |
| **Gesamt** | **56** |

### Prioritäts-Empfehlung

1. **Sofort beheben** (Hoch): #1 Wishlist-Duplikat-Bug, #3 Song-Click ohne Error-Handling, #5 startJukebox ohne Fehler-Abfang, #7 Doppelte Filter-Controls, #8 Doppelte Start-Buttons, #11 Fortschrittsbalken, #15 Duplizierte Wishlist-Integration, #20 Lyrics `.slice(2)` Bug
2. **Bald beheben** (Mittel): #4 Auto-play Race Condition, #10 playPrevious Wrap-Around, #12 Song-Duration-Tracking, #17 Shuffle Toggle inkonsistent, #18 Dual-Audio-Playback
3. **Strukturell verbessern** (Code-Qualität): #22 Player-View aufteilen, #23 Hook aufteilen, #24 Duration-Formatter zentral, #27 Interface aufteilen
4. **Features implementieren** (nach Fixes): F1-F2 Fortschrittsbalken+Zeit, F8 Playlist-Persistierung nutzen, F15 Companion-Steuerung, N1 Kollaborative Jukebox, N4 Jukebox-Timer
