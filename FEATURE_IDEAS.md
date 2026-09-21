# Karaoke Successor - Feature Ideas

## ✅ COMPLETED Features

### 1. Duett-Modus mit 2 Mikrofonen ✅
- P1/P2 Sektionen in UltraStar-Dateien werden geparst
- Spieler-Namen aus #VIDEO Tag (p1=, p2=)
- Store unterstützt zwei Mikrofon-Device-IDs
- Harmony-Erkennung berechnet Harmony-Score
- Duet-spezifische Scoring-Boni

### 2. Achievement System ✅
- 14 vordefinierte Achievements
- Store mit unlockAchievement() und unlockedAchievements
- AchievementsScreen UI mit Grid-Anzeige
- Visual feedback für freigeschaltete Achievements

### 3. Daily Challenges ✅
- Täglich wechselnde Herausforderungen (5 Typen)
- Streak-Tracking
- DailyChallengeScreen UI
- Fortschrittsanzeige und Belohnungen

### 4. Practice Mode ✅
- Store mit Loop-Region und Playback-Rate
- Playback-Raten: 0.5x, 0.75x, 0.9x, 1.0x
- Loop-Start/End setzen

### 5. Particle Effects ✅
- Funken bei Perfect-Hits (Cyan sparks + golden stars)
- Goldene Partikel für Golden Notes (Star-shaped particles)
- Combo-Feuerwerk bei Meilensteinen (10, 25, 50, 100)
- Konfetti-Regen bei 100er Combo
- Combo-Feuer-Effekt unter Combo-Anzeige

### 6. Voice Visualization ✅
- Spektrum-Visualizer (Frequenz-Balken)
- Wellenform-Anzeige
- Zirkulärer Visualizer-Modus
- Pitch-Anzeige in Hz

### 7. Animated Backgrounds ✅
- Dynamische Hintergründe mit Disco-Lichtern
- Pulsierende Kreise vom Zentrum
- Aufsteigende Partikel
- Integriert sich mit Cover-Bildern
- Nur aktiv wenn kein Video vorhanden

### 8. PWA Offline Support ✅
- manifest.json mit voller Konfiguration
- Service Worker für Offline-Caching
- Installation als App möglich
- Läuft ohne Internet

### 9. Audio Effects ✅
- Reverb (Hall-Effekt) mit Mix und Decay
- Echo/Delay mit Zeit und Feedback
- Browser-basierte Effekte (Noise Suppression, Echo Cancellation, Auto Gain)
- Einstellbar in den Settings

### 10. Social Features ✅
- Shareable Score Cards für Social Media
- Canvas-basierte Bild-Generierung (1200x630)
- Download und Twitter-Share
- Shorts Creator für Video-Clips
- 9:16 Format für TikTok/Reels/Shorts

### 11. Online Leaderboard Backend ✅
- PHP API für Shared Hosting
- MySQL Datenbank-Schema
- REST Endpoints für Scores, Players, Songs
- Rate Limiting und CORS Support

### 12. Privacy Settings ✅
- Spieler können wählen ob sie auf dem Leaderboard erscheinen
- Foto-Anzeige ein/aus
- Länder-Flagge ein/aus
- Länderauswahl mit Flaggen
- Vorschau wie man auf dem Leaderboard aussieht

---

## 🔄 IN PROGRESS — GEARKT (auf Nutzerwunsch)

### 13. Online Leaderboard Frontend 🅿️ GEPARKT
- Globale Rangliste
- Per-Song Leaderboard
- Spieler-Detail-Ansicht mit Top-Songs
- Suchfunktion
- **Status: Auf Nutzerwunsch geparkt — der Nutzerteil des Backends fehlt noch.**

---

## 🔧 Technische Verbesserungen

### 14. Sync & Backup ✅ (2026-09-21)
- „Cloud Sync“ als Offline-Geräte-Transfer realisiert (bewusst ohne Cloud: Server-/Account-frei, datenschutzfreundlich)
- Backup-Datei (JSON): Profile, Highscores, Achievements, Playlists, eigene Songs, Statistiken, optional ALLE Song-Medien (Audio/Video/Cover/TXT als Base64)
- Wiederherstellen mit Vorschau + klugen Merges: Profile/Songs/Playlists nach ID (Backup gewinnt), Highscores pro Song+Spieler immer der bessere Lauf
- Gerätegebundene Einstellungen (Mikro-Geräte, Companion-Registrierung, Songs-Ordner-Pfade) werden bewusst NIE übernommen
- UI: Settings → „Sync & Backup“ (💾) — Export-Download, Import-Vorschau, Toggles für Medien/Einstellungen

### ~~15. YouTube/Spotify Integration~~ ❌ GESTRICHEN (2026-09-21)
- **Auf Nutzerwunsch gestrichen — rechtlich zu bedenklich.**

---

## 🎤 Audio Features

### 16. Voice FX Studio ✅ (2026-09-21)
- **Pitch-Korrektur** („Auto-Tune light“): chromatisches Snapping über eigenen Pitch-Shifter-AudioWorklet, Stärke-Regler 0–100 %, wirkt NUR auf den Monitor-Mix — die Wertung hört die echte Stimme (Analyser tapept das rohe Mikrofon)
- **Harmonizer**: zweite Stimme in einstellbarem Intervall (±12 Halbtöne) mit eigenem Pegel
- **Stimm-Effekte**: 🤖 Roboter (Ring-Modulation 30 Hz), 📞 Telefon (Bandpass 300–3400 Hz), 🌊 Chorus (25 ms LFO-Delay), 📣 Megafon (Tanh-Verzerrung + Bandpass)
- Granularer 2-Tap-Pitch-Shifter (sin/cos-Crossfade, klickfrei) als `public/audio-worklets/pitch-shifter.js`
- UI: In-Game-Audio-Panel → „🎛️ Voice FX Studio“ (versteckt sich, wenn AudioWorklets fehlen); Einstellungen persistieren (localStorage)

### 17. Karaoke-Filter / Instrumental-Export ✅ (2026-09-21)
- Live-Gesangsfilter im Spiel existierte bereits (Mitten-Kanalcancellation L−R)
- NEU: **Instrumental-Export** — rendert den Song offline (schneller als Echtzeit) als 16-Bit-PCM-WAV: Gesangs-Entfernung per Regler (0–100 %) + Bass-Erhaltung (Tiefpass 140 Hz wird aus dem Original beigemischt)
- UI: Song-Start-Modal → „🎚️ Instrumental“ → Stärke-Regler + Fortschrittsbalken + Download (`<Titel> (instrumental).wav`)
- Blocker-Guards: MIDI-Synthese / Plattform-Video / Cross-Origin werden sauber abgefangen und verstecken den Button
- Ehrlich dokumentiert: DSP-Cancellation (keine KI-Stem-Trennung — die würde Modelle im zweistelligen MB-Bereich erfordern); wirkt am besten bei Stereomixes mit zentriertem Gesang

---

## 🏆 Social Features — GEPARKT (auf Nutzerwunsch)

### 18. Twitch/Stream Integration 🅿️ GEPARKT
- Overlay für Streamer
- Chat-basierte Song-Wünsche
- Viewer-Voting für Schwierigkeit
- **Status: Auf Nutzerwunsch geparkt — rechtliche Bedenken, Umsetzung wenn überhaupt sehr speziell.**
