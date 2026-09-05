# Online-Leaderboard: Deployment-Anleitung (Erreichbarkeit + Datenschutz)

Diese Anleitung beschreibt, wie du die Online-Leaderboard-API (`leaderboard-api/`)
für die Karaoke-App erreichbar machst und deine Daten (Datenbank-Zugangsdaten
und Spielerdaten) schützt.

**Wichtig, zuerst lesen:** Die Datei `config.php` enthielt früher echte
Datenbank-Zugangsdaten und das API-Secret **im öffentlichen Git-Repository**.
Diese Zugangsdaten müssen als kompromittiert gelten und sofort rotiert werden
(Schritt 1). Nach dieser Revision liegt kein Secret mehr im Repo.

---

## Architektur im Überblick

```
┌──────────────────────┐   HTTPS POST/GET   ┌─────────────────────────┐
│  Desktop-App          │ ─────────────────► │  Webspace (netcup)      │
│  (Tauri/Next.js)      │  X-API-Key Header  │  /leaderboard-api/      │
│  leaderboard-service  │ ◄───────────────── │  index.php (PHP v3)     │
└──────────────────────┘   JSON             └───────────┬─────────────┘
                                                         │ PDO
                                                ┌────────▼─────────┐
                                                │  MySQL            │
                                                │  ks_profiles      │
                                                │  ks_scores        │
                                                └───────────────────┘
```

- Die App kennt die API-URL aus `NEXT_PUBLIC_LEADERBOARD_URL`
  (Fallback im Code: `https://hosting236176.ae88b.netcup.net/leaderboard-api`).
- Schreibzugriffe (POST/PUT) verlangen den Header `X-API-Key` mit dem Wert
  von `API_SECRET`. Der Key wird **zur Build-Zeit** in die App eingebrannt
  (`NEXT_PUBLIC_LEADERBOARD_API_KEY`) — er ist also Teil des Client-Bundles
  und damit für jeden technically versierten Nutzer auslesbar. Er ist ein
  Spam-Schutz, keine echte Authentifizierung (siehe Abschnitt 4).
- Lesezugriffe (Leaderboards anzeigen) brauchen keinen Key.

---

## 1. Sofortmaßnahmen: Zugangsdaten rotieren (PFLICHT)

Die alten Zugangsdaten stehen in der Git-History und sind öffentlich:

1. **MySQL-Passwort ändern:** Plesk → Datenbanken → Benutzer → neues
   Passwort setzen. (Die Datenbank selbst, z. B. `k347227_karaoke_leaderboard`,
   bleibt unverändert; alle Scores bleiben erhalten.)
2. **API-Secret neu generieren,** z. B. im Terminal:
   `openssl rand -hex 32` (oder ein Passwort-Manager).
3. Beide neuen Werte kommen in `config.local.php` auf dem Webspace
   (Schritt 3) — **nicht** ins Git.
4. Da der API-Key in bereits verteilten App-Builds eingebrannt ist: Nach der
   Rotation funktioniert der Upload in alten Builds nicht mehr (401). Die App
   muss neu gebaut und verteilt werden. Das ist der Preis der Rotation —
   alles andere wäre unsicher.

Optional, falls du die Secrets auch aus der Git-History entfernen willst:
`git filter-repo` mit Pfad-Ersetzung für `leaderboard-api/config.php` und
Force-Push. Da die Zugangsdaten **in jedem Fall** rotiert werden, ist das
nicht zwingend nötig — die History enthält dann nur noch tote Werte.

---

## 2. Datenbank vorbereiten

1. Plesk → Datenbanken: MySQL-Datenbank + Benutzer anlegen (oder bestehende
   `k347227_karaoke_leaderboard` weiterverwenden).
2. `schema.sql` einmalig importieren (phpMyAdmin → Import). Es legt an:
   `ks_profiles`, `ks_scores` und die Stored Procedure
   `sp_refresh_profile_stats`.
3. **Nützlich:** Wenn die PHP-Anwendung auf demselben Webspace liegt wie die
   Datenbank, setze `DB_HOST` auf `localhost` statt auf den externen
   MySQL-Hostnamen (`mysqle88c.netcup.net`). Das ist schneller und umgeht
   Probleme mit externem DB-Zugriff.

---

## 3. API auf den Webspace bringen

Der Ordner `leaderboard-api/` wird so deployed:

| Datei | Auf Server hochladen? | Hinweis |
|---|---|---|
| `index.php` | ✅ | Front Controller |
| `config.php` | ✅ | enthält **keine** Secrets mehr |
| `anti-cheat.php` | ✅ | Server-Anti-Cheat |
| `.htaccess` | ✅ | Routing + blockiert Zugriff auf `config*.php`/`*.sql` |
| `config.local.php` | ✅ | **deine** Secrets — liegt nie im Git |
| `schema.sql` | ❌ nach Import löschen | wird von `.htaccess` geblockt, gehört aber nicht auf den Server |
| `config.local.example.php` | optional | nur Vorlage |

**`config.local.php` anlegen** (Vorlage: `config.local.example.php`):

```php
<?php
define('DB_PASS', 'DEIN_NEUES_DB_PASSWORT');
define('API_SECRET', 'DEIN_NEUES_LANGES_RANDOM_SECRET');
```

Soll die DB-Adresse vom Standard abweichen, zusätzlich definieren:
`DB_HOST`, `DB_NAME`, `DB_USER` (alternativ: Umgebungsvariablen
`KS_DB_HOST`, `KS_DB_NAME`, `KS_DB_USER`, `KS_DB_PASS`, `KS_API_SECRET` —
diese haben Vorrang vor `config.local.php`).

**Funktionscheck** im Browser:

```
GET https://hosting236176.ae88b.netcup.net/leaderboard-api/
→ {"name":"Karaoke Leaderboard","version":"3.0.0",...}
```

Ein direkter Aufruf von `https://…/leaderboard-api/config.php` muss
**403 Forbidden** liefern (`.htaccess`).

---

## 4. Datenschutz: Was gespeichert wird — und was du tun solltest

### Was die Datenbank hält

| Feld | Inhalt |
|---|---|
| `profile_uid` | vom Client erzeugte UUID (pseudonym, geräteübergreifend) |
| `display_name` | frei gewählter Anzeigename (1–64 Zeichen) |
| `color` | Profifarbe |
| `country_code` | optional, ISO-Code; wird nur angezeigt, wenn `show_country=1` |
| Scores | Punktzahl, Genauigkeit, Combo, Schwierigkeit pro Song-Hash |

**Nicht** gespeichert: E-Mail, Passwort, IP-Adressen (Rate-Limiting nutzt
IPs nur in temporären Dateien, nie die DB), Songtitel/Interpreten/Texte
(nur SHA-256-Fingerprint-Hashes — copyright-sicher).

### Datenschutz-Flags

- `show_on_board = 0` → Profil taucht in **keiner** öffentlichen Liste auf
  (serverseitig in jeder Query gefiltert, nicht nur ausgeblendet).
- `show_country = 0` → `country_code` wird serverseitig zu `NULL`,
  bevor die Antwort die API verlässt.
- In der App steuert das Profil-Privacy-Panel diese Flags; der Upload
  geschieht nur, wenn „Online-Leaderboard" aktiviert ist.

### Profil-Sync und Ownership (sync_code)

Jedes Profil hat einen **8-stelligen Sync-Code** — er ist gleichzeitig
Besitz-Nachweis und Sync-Schlüssel:

- **Erzeugt bei der Registrierung** auf dem Server (oder vom Client
  übernommen, wenn bereits einer existiert) und in der App gespeichert.
- **Jeder Schreibzugriff** aufs Profil (Score einreichen, Einstellungen
  ändern, Sync-Backup, Profil löschen) verlangt diesen Code. Wer nur den
  API-Key hat (der im Client-Bundle steckt), kann fremde Profile nicht
  manipulieren — die größte frühere Lücke ist damit geschlossen.
- **Profil-Sync:** Über „Profil hochladen" in der Charakter-Ansicht wird
  ein privates Backup (Profildaten + lokale Highscores) unter dem Code
  gespeichert; ein anderes Gerät stellt per Code-Eingabe alles wieder her.
  Das Backup ist **privat** — es erscheint auf keinem öffentlichen
  Leaderboard und enthält als einziges serverseitiges Datum lokale
  Songtitel (nur für den Code-Inhaber abrufbar, max. 1 MB).
- **Löschen (DSGVO):** `DELETE /profiles/{uid}` mit Sync-Code entfernt
  Profil, Scores und Backup vollständig (Cascade in der DB).

### Anti-Cheat-Status

Scores werden mit `verified`-Flag gespeichert; das UI zeigt bei verifizierten
Scores einen grünen Haken. Der Server prüft jetzt dieselbe Punkteformel, die
das Spiel verwendet (Punkte-pro-Tick = 70 % bzw. 80 % des Maximal-Pools
durch die Tick-Anzahl), plus Integritäts-Hash und Zeitfenster. Party-Modi
mit eigenem Punkte-Maßstab werden ohne Proof eingereicht und als
„unverifiziert" gespeichert. Ein Konsistenz-Test
(`src/__tests__/leaderboard-anticheat.test.ts`) bricht den Build, falls
Client- und Server-Formel auseinanderlaufen.

---

## 5. App-Build konfigurieren

Die URL und der API-Key werden zur **Build-Zeit** eingebrannt:

1. Im Projektroot eine `.env.local` anlegen (`.gitignore` ignoriert `.env*`
   bereits — nichts committen):
   ```
   NEXT_PUBLIC_LEADERBOARD_URL=https://hosting236176.ae88b.netcup.net/leaderboard-api
   NEXT_PUBLIC_LEADERBOARD_API_KEY=<API_SECRET aus config.local.php>
   ```
2. App bauen (`npm run tauri:build` bzw. CI). Ein fehlender Key bedeutet:
   Anzeigen (GET) funktioniert, **Upload scheitert mit 401**.
3. **CI-Builds (GitHub Releases):** Beide Workflows lesen die Secrets
   `NEXT_PUBLIC_LEADERBOARD_URL` und `NEXT_PUBLIC_LEADERBOARD_API_KEY` und
   übergeben sie an den Build. Einrichtung: Repository → Settings → Secrets
   and variables → Actions → beide Secrets anlegen. Ohne Secrets bauen die
   Releases mit den Code-Defaults (aktuelle API-URL, leerer Key) — dann
   funktioniert weiterhin das Anzeigen, aber kein Upload.

---

## 6. Betrieb & Pflege

- **Backups:** Plesk → Datenbank → Export regelmäßig (z. B. wöchentlich).
- **Fehlerdiagnose:** `config.php` schreibt Fehler absichtlich nicht ins
  Response-Body (nur generische Meldungen). PHP-Errorlog über Plesk einsehen.
- **Rate Limit:** 60 Requests/Minute pro IP. Bei einer normalen Party
  (Desktop-App sendet) unkritisch.
- **Verbindungstest:** App-Einstellungen → „Verbindung testen" ruft denselben
  Health-Check (`GET /`) auf wie der Browser-Test oben.
