# Karaoke Leaderboard API (v3)

PHP/MySQL API for the Karaoke Successor online leaderboard.
Copyright-safe: songs are identified only by a SHA-256 fingerprint hash
(`v1:<16 hex chars>`) — no titles, artists, or lyrics are stored.

## Files

| File | Purpose |
|------|---------|
| `index.php` | Front controller + all endpoints |
| `config.php` | Bootstrapping, CORS, rate limit, API-key check, helpers |
| `config.local.php` | **Local secrets — NOT in git.** Create from `config.local.example.php` |
| `anti-cheat.php` | Server-side proof verification (mirrors `src/lib/leaderboard/anti-cheat-proof.ts`) |
| `schema.sql` | MySQL schema (import once, then remove from the server) |
| `.htaccess` | Routing + blocks direct access to `config*.php` / `*.sql` |

## Installation on Shared Hosting (netcup)

1. Create a MySQL database and a database user (Plesk → Datenbanken).
2. Import `schema.sql` via phpMyAdmin.
3. Copy `config.local.example.php` to `config.local.php`, fill in `DB_PASS`
   and `API_SECRET` (and DB host/name/user if they differ from the defaults
   in `config.php` — which are empty by default and set via env vars
   `KS_DB_HOST`, `KS_DB_NAME`, `KS_DB_USER`, `KS_DB_PASS`, `KS_API_SECRET`).
   On netcup shared hosting use the database hostname shown in Plesk
   (e.g. `mysqle88c.netcup.net`) as `DB_HOST` — NOT `localhost`, which
   connects via Unix socket to a different MySQL instance and fails with
   error 1045 (Access denied) even though user/password are correct.
4. Upload the folder contents to `https://your-domain.com/leaderboard-api/`.
5. Delete `schema.sql` from the server after the import (it is blocked by
   `.htaccess`, but it has no business being deployed).
6. Test: `GET https://your-domain.com/leaderboard-api/` → API info JSON.

## Authentication

**Every request except a CORS preflight requires the header `X-API-Key`** with
the value of `API_SECRET` (since v3.5.0 — previously only POST/PUT). The
desktop app ships this key in its client bundle
(`NEXT_PUBLIC_LEADERBOARD_API_KEY`) — it is therefore **not** a security
boundary against determined attackers, only a spam deterrent. The client
has always sent the header on every request, so the tightening is purely
server-side.

**Profile ownership:** every write to a profile (score submission, settings
update, sync snapshot, deletion) additionally requires the profile's
`sync_code` (8 chars A-Z0-9). The server generates one at registration and
returns it in the register/update responses; clients must persist it. This
prevents anyone with the API key from writing to *foreign* profiles.
Public `GET /profiles/{uid}` responses never contain the sync_code.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | **v3.7** Deployment diagnostics behind the API key: DB connection (+ connected database name), all 7 tables + every column the API references (with copy-paste `ALTER TABLE` fixes), `sync_code` width, stored procedure, and the real board queries executed live — a failing query reports the exact MySQL error. Response: `problems[]` + `fixes[]`. |
| POST | `/profiles` | Register/upsert profile (`profile_uid`, `display_name`, `color`, `country_code`, `show_on_board`, `show_country`, optional `sync_code`). Upserting an existing profile requires its sync_code; new profiles get one generated when omitted. |
| GET | `/profiles/{uid}` | Public profile data (no sync_code) |
| GET | `/profiles/{uid}/plays?limit=N` | **v3.6** Recent online rounds (play log, newest first — song hashes only) |
| PUT | `/profiles/{uid}` | Update settings — requires `sync_code`; all fields expected. **v3.6**: display names are checked against a blocklist (HTTP 422 on hits) |
| DELETE | `/profiles/{uid}` | Delete profile + scores + daily results + sync snapshot + linked account (DB cascade, GDPR) — requires `sync_code` |
| PUT | `/profiles/{uid}/sync` | Store private profile sync snapshot — requires `sync_code` |
| GET | `/profiles/sync/{code}` | Retrieve profile sync snapshot by code |
| POST | `/scores` | Submit score (upsert — higher score wins, with anti-cheat proof) — requires profile `sync_code`; optional `nonce` (32 hex chars, replay protection) |
| GET | `/leaderboard/song/{hash}?game_type=s|d&difficulty=all|easy|normal|hard&limit=N` | Per-song Top N — **v3.7**: difficulty filter is a TRUE per-difficulty best (difficulty is part of the best-score key); `difficulty=all` shows each player's overall best. Soft-flag badges (`ac_flags`) in rows |
| GET | `/leaderboard/global?window=all|month|week&sort=score|best|accuracy|plays&uid=…&limit=N&offset=M` | Global player ranking — time windows (calendar month / ISO week), alternative sorts, `total_players`, own `rank` + `percentile_top` via `uid` |
| GET | `/leaderboard/crowns?uid=…` | **v3.6** Song-#1 ("crown") count + list for a visible profile |
| POST | `/daily` | Submit daily-challenge result (upsert — best metric wins) — requires profile `sync_code` |
| GET | `/daily?date=YYYY-MM-DD&limit=N` | Daily-challenge board for a date (all challenge types, ranked per type) |
| POST | `/auth/register` | Link an e-mail + password account to a profile — requires profile `sync_code`. Returns a one-time `recovery_code`. Re-registering a profile that already has an account REPLACES it (forgot-password rescue, sync_code is the ownership proof). |
| POST | `/auth/login` | App-only login: verify e-mail + password → returns `profile_uid` + `sync_code` (+ a first-issued `recovery_code` for legacy accounts without one) |
| POST | `/auth/password` | Change account password — requires `current_password` |
| POST | `/auth/recover` | Reset a forgotten password with the one-time recovery code (`email` + `recovery_code` + `new_password`) — rotates to a NEW recovery code |
| GET | `/scores/batch?hashes=..` | Batch-fetch leaderboards for multiple song hashes |

## Profile sync (cross-device)

The client stores a private backup of a profile (display data, XP,
achievements, stats, privacy, and optionally the local highscores) under
the profile's sync code:

```
PUT /profiles/{uid}/sync      { "sync_code": "AB12CD34", "profile": {...}, "highscores": {...} }
GET /profiles/sync/AB12CD34   → { "profile_uid", "profile", "highscores", "updated_at" }
```

The backup is **personal data**: the highscores may contain local song
titles. It never appears on any public leaderboard and is only returned to
whoever presents the sync code. Snapshots are capped at 1 MB per request.

## Score submission

Payload (all required unless noted):

```json
{
  "profile_uid": "uuid-v4",
  "sync_code": "AB12CD34",
  "song_hash": "v1:0123456789abcdef",
  "song_hash_v2": "v2:… (optional)",
  "game_type": "s",
  "score": 9500,
  "max_score": 10000,
  "accuracy": 92.5,
  "max_combo": 45,
  "difficulty": "normal",
  "rating": "excellent",
  "notes_hit": 180,
  "notes_missed": 15,
  "proof": { "…": "see anti-cheat.php" }
}
```

Response: `{ "ok": true, "rank": 1, "is_new_best": true, "verified": true }`
(+ `verification_note` / `flags` when the anti-cheat marked the score).

`verified` semantics: a score is verified only when a proof package is sent
and passes integrity hash, timestamp window, plausibility, and
points-per-tick re-computation. Points-per-tick is re-computed from the
claimed tick counts under the client scoring model
(`tickPool = 70% (or 80% without golden notes) of max_score`). Scores
without proof are accepted but stored as unverified.

**Serialization contract (v3.4.0 / R67):** the integrity hash is built by
joining values with `|` and hashing with `hash('sha256', …)`. Three former
client-side violations made it mismatch for virtually every score: (a) the
client hashed the internal difficulty `medium` while the payload carried the
API form `normal`; (b) the raw accuracy float serialized differently in JS
(shortest round-trip, up to 17 significant digits) and PHP (`precision=14`);
(d) the client's internal SHA-256 stringified negative result words as
signed int32 (`"-30f7239b"` — ~99.6% of hashes contained a `-` that
`hash()` can never emit). The client now guarantees before hashing AND
submitting: `accuracy` rounded to 2 decimal places, `points_per_tick`
rounded to 8 decimal places, `difficulty` in API form
(`easy|normal|hard`, never the internal `medium`), every other numeric hash
input an integer, and standard unsigned-hex SHA-256 output. Also in v3.4.0:
the plausibility reason `combo_exceeds_hits` was replaced by
`combo_exceeds_notes` — combo is note-based and may legitimately exceed
`notes_hit` on easy/medium (short notes with 0 hit ticks build the combo
without counting as hits), so the ceiling is now the song's total note
count (5% tolerance).

**Song hash format (legacy, accepted):** the client's song fingerprints
(`v1:-30f7239b17ad154`) use the same signed-word SHA-256 representation and
therefore contain `-` characters in ~75% of cases. The format is
deterministic and collision-free, already stored in the DB by deployed
builds, and kept as-is (changing it would split the per-song boards between
old and new app versions) — `isValidSongHash` in `config.php` accepts the
`-`. Before v3.4.0 those ~75% of uploads were rejected as
"Invalid song_hash".

**v3.5.0 (R69) additions:**
- `combo_multiplier` in the proof is bounds-checked to `[1, 2]` (the client
  now sends the real multiplier its best combo reached — 1, 1.25, 1.5, 1.75
  or 2 — instead of the old hardcoded 1; values outside the model's range
  are rejected as `invalid_combo_multiplier`).
- The client's proof chain now carries REAL per-note completion data from
  the scoring pass (previously reconstructed from the claimed sums). A
  chain shorter than `notes_hit + notes_missed` is soft-flagged as
  `chain_note_mismatch` (legacy synthetic proofs capped the chain at 200
  entries, so this stays a flag, not a rejection).
- `played_at` only updates when a submission actually becomes the new best
  (previously every replay of the same song bumped it, even losing ones).

**v3.6.0 (R72) additions:**
- **Replay nonces**: `POST /scores` accepts an optional `nonce` (32 hex
  chars, one per wire call — the server stores it in `ks_nonces` and
  answers `409 Replay detected` on duplicates). `POST /br` REQUIRES it.
  Old app versions without a nonce still work for scores.
- **Play log**: every accepted submission appends one row to `ks_play_log`
  (regardless of personal best) — the basis of the month/week boards and
  `/profiles/{uid}/plays`. Rows older than 400 days are pruned
  probabilistically (~1% of submissions trigger a cleanup); nonces after
  1 day.
- **Outlier soft-flags**: `near_max_low_accuracy` (score ≥ 9500 with
  accuracy < 70 is not reachable in the client scoring model) and
  `new_profile_top10` (profile younger than 24 h instantly landing a Top-10
  spot on a song board with ≥ 5 entries). Flags are surfaced in the song
  board / batch rows (`ac_flags`) — the UI badges them, never hides them.
- **Sync-code entropy**: NEW codes are 12 chars from the unambiguous
  alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (60 bits; legacy codes were 8
  chars / 41.5 bits). Existing 8-char codes stay valid — both lengths are
  accepted everywhere (`isValidSyncCode`).
- **Dual-read fingerprints**: song board, batch and rank queries match
  `song_hash = ? OR song_hash_v2 = ?` so future v2-only clients see the
  same boards.
- **Display-name blocklist**: register/update reject clearly abusive names
  (insults/slurs/extremist terms, German + English, leet-normalized,
  word-boundary matching) with HTTP 422. Extend at runtime via the
  `KS_NAME_BLOCKLIST` env var (comma-separated) — no code change needed.

**v3.7 (R81) — score system rebuild:**
- **Battle-Royale win counter REMOVED**: `br_wins`/`br_wins_at` columns and
  `POST /br` are gone. BR has no comparable score scale (2-player BR is
  easier than 25-player BR) and win counters are trivially fakeable.
- **difficulty is part of the best-score keys**: `ks_scores` keeps one row
  per `(profile, song, game_type, difficulty)`, `ks_daily_results` one row
  per `(profile, date, type, difficulty)` — difficulty filters are true
  per-difficulty bests; `difficulty=all` dedupes per profile to the overall
  best (songBoard + /scores/batch).
- **Daily pool**: `challenge_type` accepts the client's full 200-type pool
  (generated from challenge-pools.ts — `dailyTypeMeta()` in index.php).
- **Path decoding**: the router `rawurldecode`s the request path — the
  client percent-encodes the song hash's `:` as `%3A`; undecoded, every
  `/leaderboard/song/{hash}` failed with `Invalid song_hash`.
- FRESH-INSTALL schema: re-importing schema.sql replaces the whole database
  (scores / daily results / accounts are lost by design; the app
  re-registers on its next game).

**v3.6.2 (R78) fix:**
- **`POST /scores` upsert repaired**: since R69 a PHP `//` comment sat
  INSIDE the SQL string of the upsert statement. MySQL has no `//`
  comments (only `-- `, `#`, `/* */`), so the statement failed with
  error 1064 and every score upload answered HTTP 500. The comment now
  lives outside the string (PHP comment above the statement). Detected
  by the first end-to-end seed run once the exact PDO message was
  exposed by the catch-all.

**v3.6.1 (R74) additions:**
- **`GET /health`** — one-shot deployment diagnostics behind the API key.
  Checks the DB connection (with the connected database name — catches a
  wrong `DB_NAME`/credentials after a database rebuild; `/info` keeps
  working because it never touches the DB), verifies all 7 tables and
  EVERY column the API references (each missing column produces a
  ready-to-run `ALTER TABLE … ADD COLUMN` in `fixes[]`), the
  `sync_code` width (≥ 16), the stored procedure
  `sp_refresh_profile_stats`, and executes the real all-time + month +
  week board queries — a failing query reports the exact MySQL error
  message in `queries.*.error`. Findings are summarized in `problems[]`.
- **Window-board `GROUP BY` hardened**: the month/week aggregation now
  groups by the joined `ks_profiles` columns as well. MySQL 8 derives
  those from the primary-key join, but MariaDB (netcup) has no
  functional-dependency detection (MDEV-11588) — with
  `ONLY_FULL_GROUP_BY` enabled the previous `GROUP BY l.profile_uid`
  alone was rejected. Semantics are unchanged (`p.profile_uid` is the
  PK, the extra columns can never merge two profiles).

## Daily challenge

The daily-challenge board stores one result per profile, date, and
challenge type. The type pool has **22 variants** — the 4 classic ones
(`score`, `accuracy`, `combo`, `perfect_notes`) plus 18 newer types
(`golden_notes`, `notes_hit`, `tick_accuracy`, `clean_song`, `comeback`,
`sharpshooter`, `combo_master`, `perfect_storm`, `endurance`,
`golden_groove`, `precision`, `flawless_finale`, `score_sniper`,
`combo_race`, `perfect_pitch`, `golden_fingers`, `steady_hand`, `titan`).
The daily screen also offers 5 selectable difficulty levels
(`easy`, `normal`, `hard`, `very_hard`, `insane`) — the difficulty changes
the target the player must reach, never the achieved metric itself, so
entries from different difficulties remain comparable on the board.

Resubmitting the same day + type keeps the better `metric_value` (upsert —
the stored `xp_earned` follows the winning attempt). For **min-direction
types** (`clean_song`, `steady_hand` — "miss at most N notes") *lower* is
better: the upsert keeps the lower value and the board ranks them
ascending. The challenge date must be the client's local day, never in
the future and at most 7 days back.

```
POST /daily   { "profile_uid": "uuid-v4", "sync_code": "AB12CD34",
                "challenge_date": "2026-09-14", "challenge_type": "score",
                "difficulty": "hard",
                "metric_value": 8450, "xp_earned": 150 }
            → { "ok": true }

GET  /daily?date=2026-09-14&limit=100
            → { "date": "2026-09-14", "leaderboard": [ {
                  "rank": 1, "profile_uid": "…", "display_name": "…",
                  "color": "#8B5CF6", "country_code": "DE",
                  "challenge_type": "score", "difficulty": "hard",
                  "metric_value": 9820.5,
                  "created_at": "2026-09-14T18:30:00" } ] }
```

Metric bounds per type: `score`/`score_sniper`/`titan` ≤ **10 000** (the
standard scoring model's maximum — tightened in v3.5.0 from the old sandbox
value 100 000), `accuracy`-family and `tick_accuracy`-family ≤ 100,
combo-family and note-count types ≤ 5000, golden-note types ≤ 2000 (values
are rounded to 2 decimals). `difficulty` is informational (default
`normal`). `xp_earned` is informational and clamped to 0…60 000 (the local
daily system awards at most ~54k XP in one day — 365-day streak milestone
50 000 plus bonuses). The board endpoints send
`Cache-Control: public, max-age=30` (v3.5.0) so repeated views within half
a minute don't re-hit MySQL. As everywhere else, profiles with
`show_on_board = 0` are excluded and `country_code` is `null` when
`show_country = 0`.

## Online accounts (app-only login)

Online accounts let a player load their profile on another device or
location with **e-mail + password**. Accounts are strictly optional —
the sync-code flow keeps working without one.

**There is no web login.** The API speaks JSON only (never HTML), uses no
sessions and no cookies, and every request — including `/auth/login` —
requires the `X-API-Key` header that only the karaoke app ships. A plain
browser cannot authenticate.

Security properties:

- Passwords stored as **bcrypt** hashes (`password_hash()`), never in clear text
- 1 account ↔ 1 profile (both directions unique; re-register with the sync_code replaces)
- Registration requires the profile's `sync_code` (ownership proof)
- Login responses are generic (`Invalid e-mail or password`) to prevent e-mail enumeration; unknown e-mails run through a dummy bcrypt verify so timing matches
- Brute-force lockout: 5 consecutive failed logins lock the account for 15 minutes
- Server rate limit (60 req/min per IP) applies on top

### Recovery (v3.5.0 / R69)

Every account gets a **one-time recovery code** (16 chars from an
unambiguous 32-char alphabet, ≈80 bits of entropy — displayed as
`XXXX-XXXX-XXXX-XXXX`). Only its bcrypt hash is stored; the code is shown
to the user exactly once (at registration, at the first login of a legacy
account, or after a recovery — which rotates to a fresh code).

```
POST /auth/register  { "email": "singer@example.com", "password": "••••••••",
                       "sync_code": "AB12CD34" }
                    → { "ok": true, "profile_uid": "uuid-v4",
                        "recovery_code": "AB2C-DE4F-GH6I-JK8M" }
                    Re-registering a linked profile (with its sync_code)
                    REPLACES the account — the forgot-password rescue for
                    users who saved the sync code but neither the password
                    nor the recovery code. Same trust level: a sync_code
                    holder can already delete the whole profile.

POST /auth/login     { "email": "singer@example.com", "password": "••••••••" }
                    → { "ok": true, "profile_uid": "uuid-v4", "sync_code": "AB12CD34" }
                    (+ "recovery_code" exactly once for accounts created
                     before v3.5.0 that had none stored)
                    401 invalid credentials · 429 locked (5 fails = 15 min)

POST /auth/recover   { "email": "singer@example.com",
                       "recovery_code": "AB2C-DE4F-GH6I-JK8M",
                       "new_password": "••••••••" }
                    → { "ok": true, "recovery_code": "NEW-CODE-…" }
                    Sets the new password AND rotates the recovery code
                    (single-use: the old code dies here). Same lockout /
                    timing-equalization as login.

POST /auth/password  { "email": "singer@example.com",
                       "current_password": "••••••••", "new_password": "••••••••" }
                    → { "ok": true }
```

**Recovery matrix** (what a user can do when something is lost):

| Lost | Rescue |
|------|--------|
| Password, recovery code saved | `POST /auth/recover` (in-app "Forgot password?" form) |
| Password, no recovery code, but sync code | re-register via `/auth/register` (replaces the account) — in-app "Re-link account" form |
| Sync code, but account (e-mail + password) | login returns the sync code |
| Sync code AND no account | **not recoverable via API** — register a new profile (new identity); old online scores stay under the old name until manual operator deletion (GDPR: `DELETE FROM ks_profiles WHERE profile_uid = '…'` cascades everything) |

The last row is a deliberate design decision: a recovery path that works
without any surviving secret would be a theft path for other people's
profiles. For a friends-and-family instance the operator can still help in
person — the break-glass runbook lives in `docs/LEADERBOARD-SETUP.md`
(section 7): verify the player face-to-face, then set a fresh `sync_code`
via SQL. No API endpoint exists for this on purpose.

After a successful login the client receives the profile's `sync_code` and
can pull the full profile + highscores snapshot via the existing
`GET /profiles/sync/{code}` endpoint (same trust level: the password is
bound 1:1 to that profile). E-mail addresses are used for login only and
never appear on any public leaderboard.

## Privacy

| Setting | Meaning |
|---------|---------|
| `show_on_board` | Opt in/out of all public leaderboards |
| `show_country` | Show country flag (country is `NULL`ed in responses when 0) |

Profiles are identified by a client-generated UUID — no email, no password,
no IP stored (rate limiting uses IPs only in temporary files, not the DB).

**v3.6 additions to the data set:** `ks_play_log` (one row per accepted
score submission: profile, song hash, game type, score, accuracy,
difficulty, timestamp — the basis of the recent rounds list; pruned after
400 days). The v3.6 BR win counter (`ks_profiles.br_wins`) was REMOVED in
v3.7. Song titles never leave the client — the play log stores
fingerprints only, exactly like the score boards.

## Rate limiting

60 requests/minute per IP, file-based (`sys_get_temp_dir()`), enforced in
`config.php` for every request. Since v3.5.0 the counter file is guarded
with `flock(LOCK_EX)` — concurrent requests used to race past the limit.
Request bodies are hard-capped at 1.5 MB (the profile-sync snapshot has its
own tighter 1 MB limit).

**v3.6 — reverse proxies:** by default the limiter uses `REMOTE_ADDR`.
When the API runs behind a proxy you control, set `KS_TRUST_PROXY_IPS`
(comma-separated proxy IPs) — then the LAST `X-Forwarded-For` entry (the
one your proxy appended) becomes the bucket key. Without the env var the
header is ignored entirely: a client-forged XFF can never dodge or split
the buckets.
