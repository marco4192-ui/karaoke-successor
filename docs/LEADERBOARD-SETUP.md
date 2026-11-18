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
   `ks_profiles`, `ks_scores`, `ks_profile_sync`, `ks_daily_results`,
   `ks_accounts`, `ks_play_log` (v3.6), `ks_nonces` (v3.6) und die Stored
   Procedure `sp_refresh_profile_stats`.
3. **Bestehende Installation updaten (v3.5 → v3.6, R72):** NICHT das ganze
   `schema.sql` neu importieren (es enthält `DROP TABLE`-Anweisungen!),
   sondern nur den kommentierten Migrationsblock „Migration v3.5 → v3.6"
   am Ende der Datei in phpMyAdmin ausführen. Er legt `ks_play_log` +
   `ks_nonces` an, fügt `ks_profiles.br_wins`/`br_wins_at` hinzu und weitet
   `sync_code` auf `VARCHAR(16)` (neue Codes: 12 Zeichen). Wer noch auf
   ≤ v3.4 steht, führt ZUERST die dortige `recovery_hash`-Migration aus und
   dann denselben v3.6-Block.
4. **Nützlich:** Wenn die PHP-Anwendung auf demselben Webspace liegt wie die
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

**Optionale v3.6-Konfiguration (R72):**

- `KS_TRUST_PROXY_IPS` — Komma-Liste der Proxy-IPs, die DU kontrollierst.
  Nur wenn die Anfrage DIREKT von einer dieser IPs kommt, nutzt der Rate
  Limiter den LETZTEN `X-Forwarded-For`-Eintrag statt `REMOTE_ADDR`
  (sonst teilen sich alle Clients einen Bucket). Ohne Eintrag wird der
  Header komplett ignoriert — gefälschte XFF können nichts.
- `KS_NAME_BLOCKLIST` — zusätzliche gesperrte Begriffe für Anzeigenamen
  (Komma-Liste, wird mit der eingebauten Deutsch/Englisch-Liste vereinigt).

**Funktionscheck** im Browser:

```
GET https://hosting236176.ae88b.netcup.net/leaderboard-api/
→ {"name":"Karaoke Leaderboard","version":"3.6.1",...}
```

(Ohne `X-API-Key`-Header kommt erwartungsgemäß `401 Unauthorized` — auch das
ist ein erfolgreicher Check: Routing, PHP und Key-Schutz arbeiten. Das JSON
sieht man nur mit Header, z. B. per curl — siehe `/health`-Diagnose in
Abschnitt 6.)

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

### Einwilligung vor dem ersten Upload (R67)

Vor dem **ersten** Upload personenbezogener Daten (Score oder Daily-Ergebnis)
zeigt die App einen kurzen Hinweis: „Beim Hochladen werden Name, Farbe,
optionales Land und deine Punkte gespeichert" — mit den Aktionen
„Einverstanden & hochladen" / „Nicht hochladen". Ersteres speichert die
Einwilligung gerätelokal (`karaoke-leaderboard-consent` in localStorage) und
lässt die diesmal zurückgehaltenen Uploads (Score + Daily) sofort mitlaufen;
Letzteres verwirft sie für dieses Spiel und fragt beim nächsten erneut.
Zusätzlich steht der Datenschutzhinweis dauerhaft sichtbar in den
Einstellungen (Online-Aktivitäten-Karte, nur wenn online aktiviert).

### Profil-Sync und Ownership (sync_code)

Jedes Profil hat einen **8-stelligen Sync-Code** — er ist gleichzeitig
Besitz-Nachweis und Sync-Schlüssel:

- **Erzeugt bei der Registrierung** auf dem Server und in der App gespeichert
  (seit R67 erzeugt der Client **nie mehr** eigene Codes — die serverseitige
  Generierung bei `POST /profiles` ist die einzige Quelle).
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
  Profil, Scores, Daily-Ergebnisse, Sync-Backup und ein verknüpftes
  Online-Konto vollständig (Cascade in der DB). In der App erreichbar über
  Profil → Profil-Sync → **„Online-Daten löschen“** (mit Bestätigungsdialog;
  das lokale Profil bleibt erhalten, nur die Online-Verknüpfung wird
  entfernt).
- **Einstellungen nachziehen:** Änderungen an Name, Land oder Privacy-Flags
  werden für Online-Profile jetzt automatisch per `PUT /profiles/{uid}`
  (mit Sync-Code) an den Server synchronisiert — vorher erreichten Privacy-
  Änderungen nach der Registrierung den Server nie. Neue Geräte, die ein
  Profil per Sync-Code importiert haben, verwenden durchgehend die
  serverseitige `profile_uid` (`syncUid`) für alle Schreibzugriffe.

### Anti-Cheat-Status

Scores werden mit `verified`-Flag gespeichert; das UI zeigt bei verifizierten
Scores einen grünen Haken. Der Server prüft jetzt dieselbe Punkteformel, die
das Spiel verwendet (Punkte-pro-Tick = 70 % bzw. 80 % des Maximal-Pools
durch die Tick-Anzahl), plus Integritäts-Hash und Zeitfenster. Party-Modi
mit eigenem Punkte-Maßstab werden ohne Proof eingereicht und als
„unverifiziert" gespeichert. Ein Konsistenz-Test
(`src/__tests__/leaderboard-anticheat.test.ts`) bricht den Build, falls
Client- und Server-Formel auseinanderlaufen.

**R67 — Serialisierungs-Vertrag (Root-Cause „alle Scores unverified"):**
Der Integritäts-Hash wird clientseitig über JS-Strings (`String(number)`, bis
17 signifikante Stellen) und serverseitig über PHP-Strings (`precision=14`)
gebildet. **Drei** ehemalige Verstöße ließen den Hash **nie** matchen:
(a) der Client hashte die interne Schwierigkeit `medium`, während im Payload
die API-Form `normal` stand; (b) die Genauigkeit war ein ungerundeter Float
(`69.11764705882354` in JS vs. `69.117647058824` in PHP); **(d)** die interne
SHA-256-Implementation stringifizierte negative Ergebnis-Wörter als
signed int32 (`"-30f7239b…"` — 99,6 % aller Hashes enthielten ein „-“),
während PHPs `hash('sha256', …)` nie „-“ erzeugen kann — der Integritäts-
Hash konnte dadurch praktisch NIE matchen. Der Client verwendet seit R67
für Integritäts-Hash und Chain die Standard-Hex-Variante (`sha256Hex`),
rundet die Genauigkeit auf 2 Nachkommastellen und hasht die API-Form der
Schwierigkeit — alles als Vertrag in `anti-cheat-proof.ts` UND
`anti-cheat.php` dokumentiert (immer synchron halten).

**Song-Hashes bleiben im Legacy-Format:** Die Song-Fingerprints
(`v1:-30f7239b17ad154`) behalten bewusst die alte signed-Schreibweise —
das Format ist deterministisch, kollisionsfrei und bereits in der DB
gespeichert; eine Änderung würde die Per-Song-Boards zwischen alten und
neuen App-Builds spalten. Der Server akzeptiert das „-“ deshalb per
Regex (`isValidSongHash` in `config.php`). Vor R67 wurden ~75 % der
Uploads allein dadurch als „Invalid song_hash“ abgelehnt.

Zusätzlich korrigiert: die Plausibilitäts-Regel `combo_exceeds_hits` wurde
zu `combo_exceeds_notes` — Combo ist notenbasiert und darf auf easy/medium
legitim über `notes_hit` liegen (kurze Noten mit 0 getroffenen Ticks zählen
zur Combo, aber nicht als Hit); Obergrenze ist jetzt die Gesamtnotenzahl
des Songs (5 % Toleranz).

**Server-Deployment (R69):** API-Version **3.5.0** — `index.php`,
`anti-cheat.php`, `config.php` UND die DB-Migration (unten) neu
hochladen/ausführen. Wer noch auf ≤ 3.3.x steht, lädt einfach alle 3
PHP-Dateien neu hoch (config.php wegen des Song-Hash-Regex). Alte
App-Builds behalten ihr altes (kaputtes) Hash-Verhalten, ihre Scores
bleiben unverified wie vorher; keine Migration der Daten nötig.

**v3.5.0 (R69) Änderungen im Überblick:**
- **Recovery-Codes:** `/auth/register` liefert einen einmaligen
  Wiederherstellungs-Code (nur bcrypt-Hash in der DB, Rotation bei jedem
  Einsatz); NEU `POST /auth/recover` (Passwort-Reset per Code);
  `/auth/login` stellt Bestandskonten einmalig einen Code aus;
  `/auth/register` mit `sync_code` ERSETZT ein bestehendes Konto
  (Forgot-Password-Rettung). Migration: `ALTER TABLE ks_accounts ADD
  COLUMN recovery_hash VARCHAR(255) NULL` (auch als Kommentar in
  schema.sql).
- **API-Key jetzt für JEDEN Request** (vorher nur POST/PUT) — der Client
  sendet ihn ohnehin immer; reine Server-Härtung.
- **Daily-Bounds verschärft:** Score-Typen ≤ 10.000 (statt 100.000),
  XP-Deckel 60.000 (statt 100.000).
- **played_at-Fix:** Zeitstempel aktualisiert nur noch bei neuem Bestwert.
- **Rate-Limiter** jetzt flock(LOCK_EX)-gesichert; Request-Body-Hardcap
  1,5 MB; Board-GETs senden `Cache-Control: public, max-age=30`.
- **Anti-Cheat:** `combo_multiplier` wird auf [1, 2] geprüft (Client sendet
  jetzt den echten Combo-Multiplikator statt hartkodiert 1); Chain kürzer
  als hit+miss wird als `chain_note_mismatch` weich geflaggt (der Client
  baut die Chain seit R69 aus ECHTEN Per-Noten-Daten des Scoring-Pass).
- **Client (R69):** Offline-Outbox für fehlgeschlagene Score-Uploads
  (Retry beim nächsten Spielende/Fenster-Fokus), Duet-Boards in
  Preview+Modal (game_type 'd'), isLocal-Matching inkl. syncUid,
  Verified-Badge auch in der Preview, Daily-Upload nur bei
  Leaderboard-Opt-in.

### Daily-Challenge-Online-Leaderboard (neu)

Die tägliche Herausforderung hat jetzt einen eigenen Online-Bereich.
Datenbankseitig kommt die Tabelle `ks_daily_results` dazu:

| Feld | Inhalt |
|---|---|
| `profile_uid` + `challenge_date` + `challenge_type` | Eindeutig pro Spieler, Tag und Challenge-Typ (Upsert: der bessere Wert gewinnt) |
| `metric_value` | Der challenge-relevante Wert: Punkte / Genauigkeit % / Combo / perfekte Noten |
| `xp_earned` | Lokal verdiente XP (informativ) |

Zwei neue Endpunkte:

- **`POST /daily`** (API-Key + Sync-Code): reicht ein Tagesergebnis ein.
  Validierung: Datum darf nicht in der Zukunft und max. 7 Tage zurück liegen;
  plausibilitätsgeprüfte Wertgrenzen pro Typ (Score ≤ 100.000, Accuracy ≤ 100,
  Combo ≤ 5.000, Perfect Notes ≤ 5.000). Uploads für unsichtbare Profile
  (`show_on_board=0`) werden abgelehnt. Team-Ergebnisse (Koop-Daily) reichen
  den Durchschnitt beider Spieler ein.
- **`GET /daily?date=YYYY-MM-DD&limit=100`** (öffentlich): Tages-Rangliste,
  gruppiert und gerankt pro Challenge-Typ nach `metric_value` absteigend.

In der App: Daily → Tab „Rangliste" → Umschalter **Lokal / Online**. Lokal
funktioniert immer offline; Online lädt die Tagesliste vom Server und zeigt
bei Nichterreichbarkeit eine klare Meldung mit Retry-Button. Die Einreichung
läuft automatisch im Hintergrund nach jedem Daily-Spiel — allerdings **nur
für Online-Profile** (siehe nächster Abschnitt).

### Online-Spieler-Profile (optional, ohne Zwang)

Jedes Profil entscheidet selbst, wo es lebt — wählbar **bei der Anlage** und
jederzeit in den Profileinstellungen änderbar (`storageMode`):

- **💾 Nur lokal:** Alle Daten (Scores, Fortschritt, Achievements, Dailys)
  bleiben ausschließlich auf dem Gerät. Keine Registrierung auf dem Server,
  keine Uploads, keine Sync-Möglichkeit. Auf der Profil-Karte als
  „Lokal"-Badge sichtbar.
- **🌐 Online-Profil:** Teilnahme am Online-Leaderboard, Daily-Online-Board,
  geräteübergreifender Profil-Sync per Sync-Code. Die bestehenden
  Datenschutz-Flags (`show_on_board`, `show_country`, `show_photo`)
  feinsteuern die Sichtbarkeit weiterhin.

Technisch: Der Client sendet Scores/Dailies nur, wenn
`profile.storageMode !== 'local'`. Bestehende (Alt-)Profile ohne Feld gelten
weiterhin als Online, damit kein bisheriges Verhalten bricht. Neue Profile
werden standardmäßig als „Nur lokal" vorgeschlagen (Privatsphäre zuerst),
lassen sich aber mit einem Klick auf Online stellen.

### Online-Konto: E-Mail + Passwort (App-Only-Login)

Wer sein Online-Profil an einem **anderen Standort/Gerät** laden möchte,
kann optional ein Online-Konto hinterlegen — direkt bei der Profilanlage
(E-Mail + Passwort, Passwort ≥ 8 Zeichen) oder implicit über den
Login-Dialog im Profil-Screen.

**Wichtig (Anforderung):** Es gibt **keinen Web-Login**. Die API spricht
ausschließlich JSON (nie HTML), nutzt keine Sessions/Cookies, und **jede**
Anfrage — auch `/auth/login` — erfordert den `X-API-Key`, den nur die
Karaoke-App mitbringt. Ein Browser kann sich nicht anmelden.

| Endpoint | Zweck |
|----------|-------|
| `POST /auth/register` | Konto an Profil knüpfen (benötigt `sync_code` als Eigentumsnachweis) — liefert einmaligen `recovery_code`; erneuter Aufruf mit `sync_code` ERSETZT ein bestehendes Konto |
| `POST /auth/login` | E-Mail + Passwort prüfen → liefert `profile_uid` + `sync_code` (und einmalig einen `recovery_code` für Bestandskonten) |
| `POST /auth/password` | Passwort ändern (benötigt aktuelles Passwort) |
| `POST /auth/recover` | Vergessenes Passwort per Wiederherstellungs-Code zurücksetzen — rotiert zu einem NEUEN Code (einmalig) |

Sicherheit:
- Passwörter als **bcrypt**-Hashes gespeichert, nie im Klartext
- 1 Konto ↔ 1 Profil (beidseitig eindeutig; Neuregistrierung mit sync_code
  ersetzt das Konto — gleiche Trust-Ebene, der sync_code-Inhaber kann das
  Profil ohnehin löschen)
- Generische Fehlermeldungen (`Invalid e-mail or password`) + Dummy-Verify
  gegen E-Mail-Enumeration (auch bei `/auth/recover`)
- **Brute-Force-Sperre:** 5 Fehlversuche = 15 Minuten gesperrt
- IP-Rate-Limit (60 Req/min) greift zusätzlich

#### Wiederherstellung (R69) — was tun, wenn etwas verloren geht?

| Verloren | Rettung |
|---|---|
| Passwort, Recovery-Code vorhanden | Login-Dialog → „Passwort vergessen?" → E-Mail + Code + neues Passwort (`POST /auth/recover`) — der alte Code verfällt, ein neuer wird EINMALIG angezeigt |
| Passwort, kein Recovery-Code, aber Sync-Code | Profileinstellungen → „Passwort vergessen?" → Konto neu verknüpfen (`/auth/register` ersetzt das Konto) |
| Sync-Code, aber Konto vorhanden | Login liefert den Sync-Code zurück |
| Sync-Code UND kein Konto | **nicht wiederherstellbar** — neues Profil anlegen; alte Online-Scores bleiben bis zur manuellen Löschung durch den Betreiber (DSGVO: `DELETE FROM ks_profiles WHERE profile_uid = '…'`, Cascades räumen alles ab) |

Der Recovery-Code (16 Zeichen, ≈80 Bit Entropie, nur bcrypt-Hash in der DB)
wird genau EINMAL angezeigt: bei der Registrierung, beim ersten Login eines
Bestandskontos oder nach jedem Reset (Rotation). In der App warnt außerdem
ein Hinweis unter dem Sync-Code, ihn zu notieren.

Client-Flow: Registrierung läuft im Hintergrund nach der Profilanlage
(Toast-Feedback); danach wird automatisch ein erster Sync-Snapshot
hochgeladen, damit der erste Login woanders sofort Daten findet. Login im
Profil-Screen → „Online-Profil laden" → importiert Profil + Highscores.
In den Profileinstellungen kann das Passwort jederzeit geändert werden.

**Server-Migration (einmalig):** Tabelle `ks_accounts` anlegen — entweder
`schema.sql` komplett neu importieren oder nur den auskommentierten
`CREATE TABLE IF NOT EXISTS`-Block am Ende der Datei ausführen.
Bestehende Installationen führen zusätzlich EINMAL den Recovery-Code-Migrate
aus (auch als Kommentar in schema.sql):
```sql
ALTER TABLE `ks_accounts` ADD COLUMN `recovery_hash` VARCHAR(255) NULL
  DEFAULT NULL AFTER `password_hash`;
```

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

### Server-Diagnose: `GET /health` (v3.6.1)

Wenn die App oder der CI-Check („Leaderboard-API Check") meldet, dass ein
Board nicht lädt, nennt der Server auf dem normalen Weg nur
`Database error` (absichtlich generisch). Seit API v3.6.1 gibt es
`GET /health` — ein Endpoint **hinter dem X-API-Key**, der in einem
einzigen Aufruf prüft:

- DB-Verbindung (Host/Datenbank/User/Passwort aus `config.local.php`),
  inkl. verbundener Datenbankname und `sql_mode`,
- alle 7 Tabellen (`ks_profiles`, `ks_scores`, `ks_daily_results`,
  `ks_accounts`, `ks_play_log`, `ks_nonces`, `ks_profile_sync`) und **alle
  Spalten, die die API referenziert** — fehlende Spalten erzeugen ein
  fertig kopierbares `ALTER TABLE … ADD COLUMN …`,
- `ks_profiles.sync_code`-Breite (≥ 16, sonst funktionieren die neuen
  12-Zeichen-Codes nicht),
- die Stored Procedure `sp_refresh_profile_stats` (fehlt sie, schlagen
  Score-Uploads mit 500 fehl),
- die **echten Board-Queries** (All-time + Zeitfenster Monat/Woche) live
  ausgeführt — schlägt eine fehl, steht die exakte MySQL-Fehlermeldung
  (z. B. `Unknown column 'p.br_wins' …`) in `queries.*.error`,
- `problems[]` (Klartext-Beschreibungen) und `fixes[]` (SQL zum
  Copy-Pasten).

Aufruf vom eigenen Rechner (Key = `API_SECRET` aus `config.local.php`):

```bash
curl -sS -H "X-API-Key: DEIN_API_KEY" \
  "https://hosting236176.ae88b.netcup.net/leaderboard-api/health" | python3 -m json.tool
```

Typische Befunde nach einem Datenbank-Neuaufbau:

| `problems[]` sagt … | Bedeutung / Fix |
|---|---|
| `DB-Verbindung fehlgeschlagen` | `config.local.php`: `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASS` prüfen (neues DB-Passwort? falscher Host?). `/info` funktioniert trotzdem, weil es die DB nie berührt. |
| `Tabelle ks_play_log fehlt in Datenbank …` | Tabellen wurden in einer **anderen** Datenbank angelegt, als `DB_NAME` sagt — oder der Migrationsblock fehlt. `database_name` oben in der Antwort zeigt, wo die API tatsächlich landet. |
| `Tabelle ks_profiles existiert, aber es fehlen Spalten: br_wins …` | Alter Tabellenstand (v3.5) — `fixes[]` enthält das fertige `ALTER TABLE`. |
| `Query board_window_month schlaegt fehl: …` | Die exakte MySQL-Meldung der sonst 500-enden Board-Abfrage. |

Der CI-Job „Leaderboard-API Check" ruft `/health` automatisch mit auf und
druckt die Diagnose ins Build-Log — auch dort sieht man die Ursache also
ohne SSH/phpMyAdmin. (Auf Servern < v3.6.1 meldet der Job, dass `/health`
fehlt — dann `index.php` aktualisieren.)

- **Backups:** Plesk → Datenbank → Export regelmäßig (z. B. wöchentlich).
- **Fehlerdiagnose:** `config.php` schreibt Fehler absichtlich nicht ins
  Response-Body (nur generische Meldungen). PHP-Errorlog über Plesk einsehen.
- **Rate Limit:** 60 Requests/Minute pro IP. Bei einer normalen Party
  (Desktop-App sendet) unkritisch.
- **Verbindungstest:** App-Einstellungen → „Verbindung testen" ruft denselben
  Health-Check (`GET /`) auf wie der Browser-Test oben.

## 7. Break-Glass: Profil-Wiederherstellung durch den Betreiber

Wenn ein Spieler **alle vier Rettungsleinen** verloren hat — Gerät (App-Daten
weg), Sync-Code, Passwort und Recovery-Code —, gibt es bewusst keinen
Self-Service-Weg. Der Betreiber kann mit direktem Datenbankzugriff helfen.
Dieses Runbook ist absichtlich **kein API-Endpoint**: Ein fernausführbarer
Wiederherstellungsweg ohne überlebendes Geheimnis wäre ein Diebstahlweg für
fremde Profile.

### Vorher prüfen: Hat der Spieler wirklich alles verloren?

Jede einzelne dieser Leinen genügt und macht Break-Glass unnötig:

| Vorhanden | Selbsthilfe in der App |
|---|---|
| Gerät mit dem Profil | Profileinstellungen → Sync-Code wird angezeigt |
| Sync-Code | Profil-Sync → „Profil laden" + Konto-Neuverknüpfung per Sync-Code |
| Passwort (Online-Konto) | Login liefert den Sync-Code zurück |
| Recovery-Code | „Passwort vergessen?" → neues Passwort + neuer Code |

### Wann Break-Glass gerechtfertigt ist

- Der Spieler steht **persönlich** vor dir (Party-Gast, Freund, Familie) und
  kann sich erkennen lassen — Profilname, Farbe, Avatar, gespielte Songs,
  typische Scores.
- **Niemals** auf Anfrage per E-Mail/Chat ohne persönliche Verifikation:
  Name und Farbe stehen für jeden sichtbar im Board — das ist kein
  Inhaber-Nachweis, sonst könnte jeder beliebige Fremde fremde Top-Scores
  „wiederherstellen" (sprich: stehlen).

### Runbook (phpMyAdmin / MySQL-Konsole)

1. **Profil identifizieren** (z. B. über den Anzeigenamen):

   ```sql
   SELECT profile_uid, display_name, sync_code, created_at
   FROM ks_profiles WHERE display_name = 'Spielername';
   ```

2. **Backup:** Vor jedem Eingriff die Zeile sichern (mindestens das
   `SELECT *`-Ergebnis kopieren, besser Tabellen-Export).

3. **Neuen Sync-Code setzen** — 8 Zeichen aus `A–Z`/`0–9` (Validierung:
   `isValidSyncCode`), empfohlen ohne verwechselbare Zeichen `0/O/1/I`,
   z. B. aus einem Passwort-Generator:

   ```sql
   UPDATE ks_profiles SET sync_code = 'AB12CD34'
   WHERE profile_uid = '…';
   ```

   - Der **alte Code ist damit ungültig** (Unique-Key `uq_sync_code`) — wer
     ihn später findet, hat nichts mehr.
   - Kollidiert der neue Code mit einem anderen Profil, meldet MySQL einen
     Duplicate-Key-Fehler → anderen Code wählen.
   - Dieser eine `UPDATE` überträgt das komplette Profil an den Empfänger
     des neuen Codes — deshalb nur **persönlich** übergeben, niemals per
     Nachricht.

4. **Online-Konto (falls vorhanden):** Das alte Konto bleibt zunächst
   verknüpft. Der Spieler setzt sich mit dem NEUEN Sync-Code einfach selbst
   ein neues Konto (App → Profileinstellungen → Konto neu verknüpfen) — das
   ersetzt das alte serverseitig. Alternativ direkt aufräumen:

   ```sql
   DELETE FROM ks_accounts WHERE profile_uid = '…';
   ```

   (Die alte E-Mail-Adresse wird dadurch wieder frei.)

5. **Wiederherstellung beim Spieler:** App → Profileinstellungen →
   Profil-Sync → neuen Code eingeben → „Profil laden". Das stellt
   Profil-Identität, Einstellungen und — sofern mindestens einmal ein
   Sync-Upload gemacht wurde — XP, Erfolge und lokale Highscores wieder her.
   Online-Scores und Daily-Ergebnisse bleiben ohnehin serverseitig erhalten
   und rechnen automatisch weiter, sobald das Profil wieder Scores einreicht.

6. **Eingriff protokollieren** (wer, wann, welches Profil, warum) — als
   Verarbeitungsnachweis für die DSGVO-Dokumentation.

### Was NICHT wiederherstellbar ist

- Lokale Daten, die nie hochgeladen wurden (XP, Erfolge, lokal gespielte
  Songs ohne Sync-Upload) — dafür existiert keine Serverkopie.
- Ein Profil, das nie online gegangen ist (kein `ks_profiles`-Eintrag),
  existiert serverseitig gar nicht.

### Prävention (dem Spieler mitgeben)

- Sync-Code und Recovery-Code lassen sich in der App jeweils „als Textdatei
  speichern" (Button neben der Code-Anzeige) — Datei in den Passwort-Manager
  oder aufs selbe Medium wie der Konfigurations-Backup.
- Der Sync-Code ist der Hauptschlüssel: Wer ihn rettet, rettet alles.
