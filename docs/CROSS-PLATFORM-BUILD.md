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

## 2b. GitHub-Actions: Der 100 %-Standalone-Builder

Der Workflow **`.github/workflows/build-executables.yml`** („Build Standalone
Executables") erzeugt Release-fähige Builds für alle drei Plattformen —
so, dass sie auf einem **nackten System** laufen (kein Node.js, kein Browser,
**kein Internet zur Installationszeit**; Online-Inhalte wie YouTube-Embeds
natürlich ausgenommen).

**Trigger:**
- `git push --tags v1.2.3` → baut alle drei Plattformen + erstellt ein
  **Draft-Release** mit allen Artefakten und Prüfsummen (`SHA256SUMS.txt`)
- Actions-UI → „Run workflow": Plattformen einzeln wählbar, Release optional
  („create_release"-Haken)

**Was der Workflow je Plattform erzeugt:**

| Plattform | Artefakt | Standalone-Mechanismus |
|---|---|---|
| Windows | NSIS-`*-setup.exe` | `webviewInstallMode: "offlineInstaller"` — der komplette WebView2-Installer ist **im Setup eingebettet**; zusätzlich portables `node.exe`, ONNX-Runtime **und VC++-Runtime-DLLs** (msvcp140/vcruntime140) im Bundle. Installer-Größen-Check ≥ 70 MB als Sicherheitsnetz. |
| macOS | Universal-`.dmg` | Rust-Universal-Binary (`--target universal-apple-darwin`); Node.js und ONNX-Runtime werden **per `lipo` zu Universal-Binaries gemergt** (x64 + arm64) — funktioniert nativ auf Intel- UND Apple-Silicon-Macs ab 10.15. |
| Linux | `.AppImage` + `.deb` | AppImage mit `bundleSystemdeps: true` (WebKitGTK & Co. gebündelt) **und** `bundleMediaCodes: true` (ffmpeg-Medien-Codecs → H.264/AAC-Videoplayback funktioniert). deb = Paket-Manager-Variante (nutzt System-WebKit). |

**Der Workflow nutzt die kanonischen Repo-Skripte** (identisch zu lokal):
`download-node.mjs` → `download-onnxruntime.mjs` → `prepare-bundle.mjs` →
`tauri build`. Damit landet der **komplette Server mit Socket.IO**
(`socketio-server.cjs` + custom `server.js`) in jedem Build — die alten
GitHub-Builds kopierten nur das Next-standalone ohne Socket.IO, weshalb
Companions dort auf HTTP-Polling fielen, und macOS/Linux-Builds hatten gar
keine ONNX-Runtime (CREPE-Pitch-Erkennung ohne Funktion).

**macOS-Signing (optional, für „nackte" Macs ohne Gatekeeper-Warnung):**
Secrets im Repo setzen → `tauri build` signiert + notarisiert automatisch:
- `APPLE_CERTIFICATE` (base64-codiertes .p12), `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY` (z. B. „Developer ID Application: Name (TEAMID)")
- `APPLE_ID`, `APPLE_PASSWORD` (App-spezifisches Passwort), `APPLE_TEAM_ID`
Ohne Secrets: unsignierter Build (Rechtsklick → „Öffnen" bzw.
`xattr -cr /Applications/Karaoke\ ZERO.app`, siehe Release-Notes).

**Versionierung:** Der Tag bzw. die Workflow-Input-Version (z. B. `v1.0.2`)
wird vor dem Build automatisch ins `src-tauri/tauri.conf.json` geschrieben —
Artefakte und „Über"-Dialog tragen dann die Release-Version.

**ONNX-Runtime:** 1.20.0 (exakt die Version, gegen die der `ort`-Crate
2.0.0-rc.12 gebaut ist; C-ABI-abwärtskompatibel). Zentral änderbar über
`env.ONNX_VERSION` im Workflow.

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
| **Gatekeeper** | macOS | Unsignierte Builds (ohne Apple Developer Account) lösen beim ersten Start die Warnung „nicht verifizierter Entwickler" aus. Abhilfe: Rechtsklick → „Öffnen" oder `xattr -cr /Applications/Karaoke\ ZERO.app`. Für Distribution: Signing + Notarization (Apple Developer Program, ~99 €/Jahr) — im GitHub-Workflow vorbereitet, nur Secrets setzen (siehe 2b). |
| **Proprietäre Video-Codecs** (H.264/AAC) | Linux | **Im AppImage GELÖST**: `bundleMediaCodes: true` bündelt die ffmpeg-Medien-Codecs → Plattform-Embeds und lokale H.264-MP4s spielen. Nur das **deb** nutzt das System-WebKit (je nach Distribution ohne proprietäre Codecs). Lokale Audiodateien sind immer unbeeinflusst (Rust-Audio-Engine via Symphonia + cpal). |
| **WebKit-Sicherheits-Updates** | Linux | Trade-off des gebündelten AppImage-WebKit (`bundleSystemdeps: true`): WebKitGTK-Updates erreichen das AppImage NICHT automatisch — das deb bleibt der „immer aktuelle" Weg. Bewusste Entscheidung pro maximaler Kompatibilität. |
| **AppImage & FUSE** | Linux | AppImages brauchen FUSE (auf modernen Distros meist vorhanden). Ohne FUSE: `./Karaoke*.AppImage --appimage-extract-and-run`. glibc-Baseline: gebaut auf Ubuntu 22.04 (glibc 2.35) → läuft auf praktisch allen aktuellen x64-Distributionen (Alpine/musl ausgenommen). |
| **WebView2** | Windows | Der NSIS-Installer bettet den **kompletten WebView2-Offline-Installer** ein (`webviewInstallMode: "offlineInstaller"` → Installer ~110–160 MB statt ~40 MB) — Installation ganz ohne Internet, auch auf frischen/LTSC-Systemen. WebView2 bleibt danach ein normales, auto-aktualisierendes System-Bauteil. |
| **macOS-Firewall** | macOS | Beim ersten Start fragt macOS ggf. nach Netzwerk-Freigabe für den Node-Server (Port 3000, nur lokal) — mit „Erlauben" bestätigen. |
| **RPM-Build** | Linux | Der CI-Workflow baut gezielt `--bundles deb,appimage` → kein rpm, kein rpmbuild-Problem. |

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
7. **`tauri.conf.json` (Standalone-Schalter, Session „100 % Standalone")**:
   `windows.nsis.webviewInstallMode = offlineInstaller` und
   `linux.appimage.bundleSystemdeps/bundleMediaCodes = true` — reine
   **Bundle-Optionen**: Windows-Code-Logik, Ressourcen-Layout, NSIS-Modus
   (currentUser) und `targets: []` unverändert; die App-Funktion ist auf
   allen Plattformen identisch. Lokale Windows-Builds laden beim Bündeln
   jetzt den WebView2-Offline-Installer (~127 MB) herunter → Installer
   wächst, Funktion bleibt gleich.
8. **`scripts/prepare-bundle.mjs`**: Bugfix — `readFileSync` fehlte in den
   fs-Importen (latenter Crash bei „server.js ersetzen", hätte JEDE
   `tauri:build`-Ausführung abgebrochen). Sonst unverändert.

Zusätzlich verifiziert:
- `download-onnxruntime.mjs` auf Linux **real getestet** (valide
  x86-64-ELF-Library, Symlink-Ketten werden korrekt aufgelöst, Idempotenz).
- `bun run lint`: 0 Fehler; Web-App läuft unverändert (Port 3000).
