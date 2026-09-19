# Cross-Platform-Build: Windows, macOS & Linux

Karaoke ZERO ist ab sofort auf **Windows, macOS und Linux** buildbar — mit einer
gemeinsamen Codebasis. Die Architektur ist auf allen Plattformen identisch:

```
Tauri-Shell (Rust)
 ├─ WebView (Windows: WebView2 · macOS: WKWebView · Linux: WebKitGTK)
 ├─ Gebündelter portabler Node.js (portable-node/) → startet
 │   den Next.js-Standalone-Server + Socket.IO (bundled/server/)
 └─ Gebündelte native Bibliotheken (bundled/native/)
      └─ ONNX Runtime (.dll / .dylib / .so) für CREPE-Pitch-Erkennung
```

**Die Windows-Version bleibt vollständig funktionsfähig** — alle Änderungen
sind plattform-gegateilt (`#[cfg]`) oder verhalten sich auf Windows exakt wie
zuvor (siehe Abschnitt „Kompatibilitäts-Garantie" unten).

---

## 1. Voraussetzungen je Plattform

### Windows (wie bisher)
- Node.js 20+, Bun 1.x, Rust (stable-msvc)
- WebView2 Runtime (Windows 10/11: vorinstalliert)

### macOS
- **Xcode Command Line Tools**: `xcode select --install`
- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 20+, Bun (`curl -fsSL https://bun.sh/install | bash`)
- macOS ≥ 10.15 (in `tauri.conf.json` → `bundle.macOS.minimumSystemVersion`)

### Linux (Debian/Ubuntu)
- `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libasound2-dev libglib2.0-dev libgtk-3-dev`
  - `libasound2-dev` wird für cpal/ALSA (Audio-Ausgabe) benötigt.
  - `libasound2t64` unter Ubuntu 24.04+ — Alternativ-Dep ist im deb-Paket
    bereits hinterlegt (`libasound2t64 | libasound2`).
- Rust (siehe oben), Node.js 20+, Bun

---

## 2. Build-Ablauf (auf der jeweiligen Zielplattform ausführen)

Tauri bündelt **pro Zielplattform** — Cross-Compiling von Windows aus ist nicht
vorgesehen (WebView-/Toolchain-Restriktionen). Pro Plattform einmalig:

```bash
# 1. Portablen Node.js herunterladen (Win: node.exe · macOS/Linux: bin/node)
bun run node:download

# 2. ONNX Runtime herunterladen (Win: .dll · macOS: .dylib · Linux: .so)
bun run onnx:download

# 3. Bundle bauen (Next.js standalone + Node + ONNX + Tauri)
bun run tauri:build
```

Ergebnisse:
| Plattform | Artefakte | Befehl (optional, gezielt) |
|---|---|---|
| Windows | NSIS-Installer (`.exe`) | `bunx tauri build --bundles nsis` |
| macOS | `.app` + `.dmg` | `bunx tauri build --bundles app,dmg` |
| Linux | `.deb` + `.AppImage` | `bunx tauri build --bundles deb,appimage` |

`prepare-bundle.mjs` läuft auf allen Plattformen identisch (es kopiert nur
Dateien und bundelt den Socket.IO-Server via esbuild).

---

## 3. Plattform-Verhalten im Detail

### Rust-Backend (`src-tauri/src/lib.rs`)
- **Node-Discovery** — Reihenfolge auf jeder Plattform:
  1. Gebündelter Node (`bundled/node/node.exe` bzw. `bundled/node/bin/node`)
  2. System-Node (`where node.exe` / `which node`)
  3. System-Bun (`where bun.exe` / `which bun`)
- **Execute-Bit-Reparatur (nur Unix)**: `ensure_executable()` setzt vor dem
  Spawn ggf. fehlendes `+x` auf dem gebündelten Node-Binary (AppImage/.app
  Kopien können das Bit verlieren). Unter Windows existiert die Funktion gar
  nicht (`#[cfg(unix)]`).
- **ONNX-Runtime-Pfad**:
  - Windows: unverändert — `exe_dir/bundled/native` wird in `PATH` und
    `ORT_LIB_PATH` aufgenommen (NSIS-Layout: Ressourcen liegen neben der .exe).
  - macOS/Linux: neu — `resource_dir()/bundled/native` wird in `ORT_LIB_PATH`
    **und** `ORT_DYLIB_PATH` aufgenommen (macOS: `.app`-Bundle → Ressourcen
    liegen in `Contents/Resources`, nicht neben der Binary).
- **Splash-Screen**: `tauri::Url::from_file_path()` erzeugt auf allen
  Plattformen korrekte `file://`-URLs (der alte manuelle `format!()` baute auf
  Unix `file:////tmp/…` mit vier Slashes, den WKWebView ablehnt).

### Audio
- cpal nutzt automatisch das native Backend: **WASAPI/ASIO** (Windows),
  **CoreAudio** (macOS), **ALSA** (Linux).
- Audio-Geräte-Auswahl via Host-ID: WASAPI/ASIO-Anfragen fallen auf
  macOS/Linux automatisch auf das Standardgerät zurück (`resolve_device`).
- Die eigentliche Dekodierung (Symphonia: MP3, AAC, FLAC, OGG, WAV, MP4, MKV)
  läuft komplett im Rust-Backend — **unabhängig vom WebView**.

### Diagnose
- Neuer Tauri-Command `app_get_platform` liefert OS, Architektur und ob
  Node/ONNX gebündelt wurden → sichtbar unter **Einstellungen → Über →
  „System & Runtime"** (nur in der Desktop-App).

---

## 4. Bekannte Plattform-Einschränkungen

| Thema | Plattform | Status |
|---|---|---|
| **Gatekeeper** | macOS | Unsignierte Builds (ohne Apple Developer Account) lösen beim ersten Start die Warnung „nicht verifizierter Entwickler" aus. Abhilfe: Rechtsklick → „Öffnen" oder `xattr -cr /Applications/Karaoke\ ZERO.app`. Für Distribution: Signing + Notarization (Apple Developer Program, ~99 €/Jahr) nötig. |
| **Proprietäre Video-Codecs** (H.264/AAC) | Linux | WebKitGTK spielt je nach Distibution keine proprietären Codecs → YouTube-/Plattform-Embeds können schwarz bleiben. **Lokale Audiodateien sind davon nicht betroffen** (Rust-Audio-Engine via Symphonia + cpal). Lokale Videodateien mit offenen Codecs (VP9/AV1/Vorbis/WebM) funktionieren. |
| **macOS-Firewall** | macOS | Beim ersten Start fragt macOS ggf. nach Netzwerk-Freigabe für den Node-Server (Port 3000, nur lokal) — mit „Erlauben" bestätigen. |
| **RPM-Build** | Linux | `tauri build` versucht rpm mit; falls `rpmbuild` fehlt, schlägt nur das rpm-Ziel fehl — `--bundles deb,appimage` umgeht das. |

---

## 5. Kompatibilitäts-Garantie für die Windows-Version

Alle Änderungen wurden so gewählt, dass das Windows-Verhalten **binär
identisch** bleibt:

1. **`tauri.conf.json`**: Der komplette `bundle.windows`-Block (NSIS-Settings)
   ist unangetastet; `macOS`/`linux`-Blöcke werden unter Windows ignoriert.
   `targets: []` unverändert → gleiche NSIS-Targets wie zuvor.
2. **`lib.rs`**: Der Windows-DLL-Pfad-Code in `run()` ist **Zeile für Zeile
   unverändert**. Die macOS/Linux-ORT-Pfade sind in
   `#[cfg(not(target_os = "windows"))]` eingeschlossen.
3. **`ensure_executable()`** und die Unix-chmod-Logik: `#[cfg(unix)]` →
   unter Windows nicht kompiliert.
4. **Splash-URL**: `Url::from_file_path()` erzeugt unter Windows exakt
   `file:///C:/…` wie die alte String-Bauweise (nur robuster bei Sonderzeichen
   im Benutzernamen dank korrektem Percent-Encoding).
5. **Scripts**: `download-node.mjs` bekam nur einen Bugfix (`require()` ist in
   `.mjs`-Dateien nicht definiert und würde den Windows-Zweig beim Logging
   crashen lassen) — der Windows-Download-Pfad selbst ist unverändert.
6. **`app_get_platform`**: rein additiver Command; die App funktioniert auch,
   wenn das Frontend ihn nicht aufruft.

Zusätzlich verifiziert:
- `download-onnxruntime.mjs` auf Linux **real getestet** (valide
  x86-64-ELF-Library, Symlink-Ketten werden korrekt aufgelöst, Idempotenz).
- `bun run lint`: 0 Fehler; Web-App läuft unverändert (Port 3000).
