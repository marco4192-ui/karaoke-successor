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
4. Upload the folder contents to `https://your-domain.com/leaderboard-api/`.
5. Delete `schema.sql` from the server after the import (it is blocked by
   `.htaccess`, but it has no business being deployed).
6. Test: `GET https://your-domain.com/leaderboard-api/` → API info JSON.

## Authentication

All `POST`/`PUT`/`DELETE` requests require the header `X-API-Key` with the
value of `API_SECRET`. The desktop app ships this key in its client bundle
(`NEXT_PUBLIC_LEADERBOARD_API_KEY`) — it is therefore **not** a security
boundary against determined attackers, only a spam deterrent. GET requests
need no key.

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
| POST | `/profiles` | Register/upsert profile (`profile_uid`, `display_name`, `color`, `country_code`, `show_on_board`, `show_country`, optional `sync_code`). Upserting an existing profile requires its sync_code; new profiles get one generated when omitted. |
| GET | `/profiles/{uid}` | Public profile data (no sync_code) |
| PUT | `/profiles/{uid}` | Update settings — requires `sync_code`; all fields expected |
| DELETE | `/profiles/{uid}` | Delete profile + scores + sync snapshot — requires `sync_code` (GDPR) |
| PUT | `/profiles/{uid}/sync` | Store private profile sync snapshot — requires `sync_code` |
| GET | `/profiles/sync/{code}` | Retrieve profile sync snapshot by code |
| POST | `/scores` | Submit score (upsert — higher score wins, with anti-cheat proof) — requires profile `sync_code` |
| GET | `/leaderboard/song/{hash}?game_type=s|d&limit=N` | Per-song Top N |
| GET | `/leaderboard/global?limit=N&offset=M` | Global player ranking |

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

## Privacy

| Setting | Meaning |
|---------|---------|
| `show_on_board` | Opt in/out of all public leaderboards |
| `show_country` | Show country flag (country is `NULL`ed in responses when 0) |

Profiles are identified by a client-generated UUID — no email, no password,
no IP stored (rate limiting uses IPs only in temporary files, not the DB).

## Rate limiting

60 requests/minute per IP, file-based (`sys_get_temp_dir()`), enforced in
`config.php` for every request.
