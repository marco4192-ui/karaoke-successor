<?php
/**
 * Karaoke Successor — Online Leaderboard API v3
 * Copyright-safe: songs identified by SHA-256 fingerprint hash only.
 * Anti-cheat: score plausibility + integrity hash verification + replay
 *   nonces (R72) + statistical outlier soft-flags.
 * Ownership: every write to a profile requires its sync_code (8 chars
 * legacy / 12 chars for new profiles since v3.6, generated at
 * registration). The sync_code also unlocks the profile sync backup and
 * profile deletion.
 *
 * v3.6.2 (R78): POST /scores upsert repaired — since R69 a PHP '//' comment
 *   sat INSIDE the SQL string; MySQL has no '//' comments, so the statement
 *   failed with 1064 and every score upload answered 500. Caught by the
 *   first end-to-end seed run (R76 seeder) once the exact PDO message was
 *   exposed (R77 catch-all).
 * v3.6.1 (R74): GET /health — deployment diagnostics behind the API key
 *   (DB connect, 7 tables + required columns incl. fix-ALTERs, stored
 *   procedure, live board queries with the exact PDO error). Window-board
 *   GROUP BY widened to the joined ks_profiles columns — MariaDB does not
 *   detect functional dependencies across joins, so the previous
 *   `GROUP BY l.profile_uid` alone could fail with ONLY_FULL_GROUP_BY.
 * v3.6.1+R77: the PDO catch-all reports the exact driver message (behind
 *   the X-API-Key); /health gained the proc_call write-path probe.
 *
 * Endpoints:
 *   GET    /                          API info
 *   GET    /health                    Deployment-Diagnose (v3.6.1): DB-Verbindung,
 *                                     alle 7 Tabellen + Pflicht-Spalten, Stored
 *                                     Procedure, Live-Board-Queries mit exaktem
 *                                     PDO-Fehler + fertigen FIX-SQL-Statements.
 *                                     Wie jeder Endpoint nur mit X-API-Key.
 *   POST   /profiles                  Register / upsert profile (upsert requires sync_code)
 *   GET    /profiles/{uid}            Public profile data (no sync_code in response)
 *   GET    /profiles/{uid}/plays      Recent online rounds (play log, newest first) — R72
 *   PUT    /profiles/{uid}            Update settings (requires sync_code)
 *   DELETE /profiles/{uid}            Delete profile + scores (requires sync_code)
 *   PUT    /profiles/{uid}/sync       Store profile sync snapshot (requires sync_code)
 *   GET    /profiles/sync/{code}      Retrieve sync snapshot by code
 *   POST   /scores                    Submit score (requires profile sync_code; optional nonce)
 *   GET    /scores/batch?hashes=..    Batch-fetch leaderboards for multiple song hashes
 *   GET    /leaderboard/song/{hash}   Per-song leaderboard (Top N, optional difficulty filter — R72)
 *   GET    /leaderboard/global        Global player ranking — R72: time windows (all|month|week),
 *                                     alternative sorts (score|best|accuracy|plays), own rank +
 *                                     percentile via &uid=, BR win counter per row
 *   GET    /leaderboard/crowns?uid=   Song-#1 ("crown") count + list for a profile — R72
 *   POST   /br                        Battle-Royale result (won=true increments br_wins;
 *                                     nonce REQUIRED — counter replay protection) — R72
 *   POST   /daily                     Submit daily-challenge result (requires profile sync_code)
 *   GET    /daily?date=YYYY-MM-DD     Daily-challenge board for a date (all types, ranked per type;
 *                                     any past date works → archive views)
 *   POST   /auth/register             Link an e-mail + password account to a profile (requires profile sync_code).
 *                                      Returns a one-time recovery code. If the profile already has an account,
 *                                      a caller holding the sync_code may REPLACE it (forgot-password rescue).
 *   POST   /auth/login                App-only login: verify e-mail + password, returns the profile's sync_code.
 *                                      Legacy accounts without a recovery code get one issued (returned once) here.
 *   POST   /auth/password             Change account password (requires current password)
 *   POST   /auth/recover              Reset a forgotten password with the one-time recovery code
 *                                      (requires e-mail + recovery code; rotates to a NEW recovery code)
 *
 * Auth notes: accounts exist so a profile can be loaded on another device.
 * There is NO web login: the API returns JSON only, never HTML, uses no
 * sessions/cookies, and every request requires the X-API-Key header that
 * only the karaoke app ships. Passwords are stored as bcrypt hashes;
 * 5 consecutive failed logins lock an account for 15 minutes.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/anti-cheat.php';

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = preg_replace('#^/leaderboard-api#', '', $uri);
$uri    = rtrim($uri, '/') ?: '/';
$parts  = array_values(array_filter(explode('/', $uri)));
$method = $_SERVER['REQUEST_METHOD'];

// Table names (with prefix)
$T_PROFILES = tbl('profiles');
$T_SCORES   = tbl('scores');
$T_DAILY    = tbl('daily_results');
$T_ACCOUNTS = tbl('accounts');
$T_PLAYLOG  = tbl('play_log');
$T_NONCES   = tbl('nonces');

try {
    match ($parts[0] ?? '') {
        '', 'info'    => json(['name' => 'Karaoke Leaderboard', 'version' => '3.6.2', 'copyright_safe' => true, 'anti_cheat' => true, 'app_only_auth' => true]),
        'health'      => apiHealth($T_PROFILES, $T_SCORES, $T_DAILY, $T_ACCOUNTS, $T_PLAYLOG, $T_NONCES),
        'profiles'    => routeProfiles($parts, $method, $T_PROFILES, $T_SCORES),
        'scores'      => routeScores($parts, $method, $T_PROFILES, $T_SCORES, $T_PLAYLOG, $T_NONCES),
        'leaderboard' => routeLeaderboard($parts, $method, $T_PROFILES, $T_SCORES, $T_PLAYLOG),
        'daily'       => routeDaily($parts, $method, $T_PROFILES, $T_DAILY),
        'auth'        => routeAuth($parts, $method, $T_PROFILES, $T_ACCOUNTS),
        'br'          => routeBr($method, $T_PROFILES),
        default       => err('Not found', 404),
    };
} catch (PDOException $e) {
    // R77: the exact driver message is exposed here — every endpoint sits
    // behind the X-API-Key, and "Database error" alone made fresh-install
    // write-path failures (e.g. the stored procedure) undiagnosable.
    err('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    err('Internal error: ' . $e->getMessage(), 500);
}

// ============================================================
// PROFILES
// ============================================================
function routeProfiles(array $parts, string $method, string $TP, string $TS): void {
    $uid = $parts[1] ?? null;
    $sub = $parts[2] ?? null;

    // POST /profiles — register or upsert (upsert requires the sync_code)
    if ($method === 'POST' && !$uid) {
        $d = body();
        requireFields($d, ['profile_uid', 'display_name']);
        $uid  = clean($d['profile_uid']);
        $name = clean($d['display_name']);
        if (!isValidUUID($uid)) err('Invalid profile_uid');
        if (mb_strlen($name) < 1 || mb_strlen($name) > 64) err('display_name: 1-64 chars');
        assertAcceptableDisplayName($name); // R72/E
        $color = preg_match('/^#[0-9a-f]{6}$/i', $d['color'] ?? '') ? $d['color'] : '#8B5CF6';
        $cc    = ($d['country_code'] ?? '') === '' ? null : $d['country_code'];
        if ($cc !== null && !isValidCountry($cc)) err('Invalid country_code');

        $code = resolveSyncCode($uid, $d['sync_code'] ?? null, $TP);

        db()->prepare("INSERT INTO `$TP`
                (`profile_uid`,`display_name`,`color`,`country_code`,`sync_code`)
               VALUES (?,?,?,?,?)
               ON DUPLICATE KEY UPDATE
                   `display_name` = VALUES(`display_name`),
                   `color`        = VALUES(`color`),
                   `country_code` = VALUES(`country_code`)")
            ->execute([$uid, $name, $color, $cc, $code]);
        fetchProfile($uid, $TP, true); return;
    }

    // PUT /profiles/{uid}/sync — store profile sync snapshot
    if ($method === 'PUT' && $uid && $sub === 'sync') { syncUpload($uid, $TP); return; }

    // GET /profiles/sync/{code} — retrieve a sync snapshot by code
    if ($method === 'GET' && $uid === 'sync' && $sub) { syncDownload($sub, $TP); return; }

    // GET /profiles/{uid}/plays — recent online rounds (R72/C: play log)
    if ($method === 'GET' && $uid && $uid !== 'sync' && $sub === 'plays') {
        recentPlays($uid, $TP, tbl('play_log'));
        return;
    }

    // PUT /profiles/{uid} — update settings (requires sync_code)
    // All fields are sent; the statement is fully static, request data is
    // bound through placeholders only.
    if ($method === 'PUT' && $uid && !$sub) {
        $d = body();
        requireOwnership($uid, $d, $TP);
        requireFields($d, ['display_name', 'color', 'show_on_board', 'show_country']);
        $name = clean((string)$d['display_name']);
        if (mb_strlen($name) < 1 || mb_strlen($name) > 64) err('display_name: 1-64 chars');
        assertAcceptableDisplayName($name); // R72/E
        $color = preg_match('/^#[0-9a-f]{6}$/i', $d['color'] ?? '') ? $d['color'] : '#8B5CF6';
        $cc    = ($d['country_code'] ?? '') === '' ? null : $d['country_code'];
        if ($cc !== null && !isValidCountry($cc)) err('Invalid country_code');

        db()->prepare("UPDATE `$TP` SET
                `display_name` = ?, `color` = ?, `country_code` = ?,
                `show_on_board` = ?, `show_country` = ?
             WHERE `profile_uid` = ?")
            ->execute([$name, $color, $cc, (int)$d['show_on_board'], (int)$d['show_country'], $uid]);
        fetchProfile($uid, $TP, true); return;
    }

    // DELETE /profiles/{uid} — remove profile + all scores (GDPR)
    if ($method === 'DELETE' && $uid && !$sub) {
        $d = body();
        requireOwnership($uid, $d, $TP);
        db()->prepare("DELETE FROM `$TP` WHERE `profile_uid` = ?")->execute([$uid]);
        json(['ok' => true, 'deleted' => $uid]);
    }

    // GET /profiles/{uid}
    if ($method === 'GET' && $uid && !$sub) { fetchProfile($uid, $TP, false); return; }

    err('Not found', 404);
}

// ── Sync-code helpers ──────────────────────────────────────

/** Validate the sync_code format (legacy 8 chars or — since v3.6 — 12
 *  chars, both A-Z0-9). */
function isValidSyncCode(string $c): bool {
    return (bool) preg_match('/^[A-Z0-9]{8}$|^[A-Z0-9]{12}$/', $c);
}

/**
 * Determine the sync_code for a register/upsert request.
 * - New profile: use the provided code (if valid + free) or generate one.
 * - Existing profile: the provided code must match (prevents take-over of
 *   an existing identity by re-registering its UUID).
 * Returns the authoritative code for this profile.
 */
function resolveSyncCode(string $uid, $provided, string $TP): string {
    $cur = db()->prepare("SELECT `sync_code` FROM `$TP` WHERE `profile_uid` = ?");
    $cur->execute([$uid]);
    $existing = $cur->fetchColumn();

    if ($provided !== null && $provided !== '') {
        $provided = strtoupper(clean((string)$provided));
        if (!isValidSyncCode($provided)) err('Invalid sync_code (8 chars A-Z0-9)');
    }

    if ($existing !== false && $existing !== null) {
        if ($provided === null || $provided === '' || !hash_equals((string)$existing, $provided)) {
            err('Profile already exists — provide the matching sync_code', 403);
        }
        return (string)$existing;
    }

    if ($provided !== null && $provided !== '') {
        $dup = db()->prepare("SELECT 1 FROM `$TP` WHERE `sync_code` = ? AND `profile_uid` <> ?");
        $dup->execute([$provided, $uid]);
        if ($dup->fetchColumn()) err('sync_code already in use', 409);
        return $provided;
    }

    return generateSyncCode($TP);
}

/** Generate a random, unused sync code.
 *  R72/A: 12 chars from the 32-char unambiguous alphabet (no 0/O/1/I) —
 *  60 bits of entropy instead of the legacy 41.5. Existing 8-char codes
 *  remain valid (isValidSyncCode accepts both lengths). */
function generateSyncCode(string $TP): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($try = 0; $try < 20; $try++) {
        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $chk = db()->prepare("SELECT 1 FROM `$TP` WHERE `sync_code` = ?");
        $chk->execute([$code]);
        if (!$chk->fetchColumn()) return $code;
    }
    err('Could not generate a unique sync_code', 500);
}

/**
 * Verify that the request carries the sync_code owning this profile.
 * Rejects unauthenticated writes to foreign profiles.
 */
function requireOwnership(string $uid, array $d, string $TP): void {
    $cur = db()->prepare("SELECT `sync_code` FROM `$TP` WHERE `profile_uid` = ?");
    $cur->execute([$uid]);
    $existing = $cur->fetchColumn();
    if ($existing === false) err('Profile not found', 404);
    $provided = strtoupper(clean((string)($d['sync_code'] ?? '')));
    if ($provided === '' || $existing === null || !hash_equals((string)$existing, $provided)) {
        err('Invalid or missing sync_code for this profile', 403);
    }
}

/**
 * Fetch a profile. $withCode controls whether the sync_code is included:
 * it is an ownership secret and must only be returned to responses that
 * already presented it (register/update), never to public GETs.
 */
function fetchProfile(string $uid, string $TP, bool $withCode): void {
    if ($withCode) {
        $s = db()->prepare("SELECT * FROM `$TP` WHERE `profile_uid` = ?");
    } else {
        $s = db()->prepare("SELECT `profile_uid`,`display_name`,`color`,`country_code`,`show_on_board`,`show_country`,`total_score`,`best_score`,`songs_played`,`games_played`,`avg_accuracy`,`br_wins`,`created_at`,`updated_at` FROM `$TP` WHERE `profile_uid` = ?");
    }
    $s->execute([$uid]);
    $p = $s->fetch() ?: null;
    if (!$p) err('Profile not found', 404);
    json($p);
}

// ── Profile sync (cross-device backup) ─────────────────────

/** PUT /profiles/{uid}/sync — store profile + highscores snapshot. */
function syncUpload(string $uid, string $TP): void {
    $d = body();
    requireFields($d, ['profile']);
    requireOwnership($uid, $d, $TP);

    $rawBody = file_get_contents('php://input');
    if (strlen($rawBody) > 1024 * 1024) err('Sync payload too large (max 1 MB)', 413);

    $snapshot = json_encode($d['profile'], JSON_UNESCAPED_UNICODE);
    if ($snapshot === false || strlen($snapshot) > 768 * 1024) err('Profile snapshot invalid or too large', 400);

    $scores = null;
    if (isset($d['highscores']) && $d['highscores'] !== null) {
        $scores = json_encode($d['highscores'], JSON_UNESCAPED_UNICODE);
        if ($scores === false) err('Invalid highscores payload', 400);
    }

    db()->prepare("INSERT INTO `ks_profile_sync` (`profile_uid`,`snapshot`,`scores`)
            VALUES (?,?,?)
            ON DUPLICATE KEY UPDATE
                `snapshot` = VALUES(`snapshot`),
                `scores`   = VALUES(`scores`)")
        ->execute([$uid, $snapshot, $scores]);
    json(['ok' => true]);
}

/** GET /profiles/sync/{code} — retrieve the snapshot behind a sync code. */
function syncDownload(string $code, string $TP): void {
    $code = strtoupper(clean($code));
    if (!isValidSyncCode($code)) err('Invalid sync code');

    $s = db()->prepare("SELECT s.`profile_uid`, s.`snapshot`, s.`scores`, s.`updated_at`
                        FROM `ks_profile_sync` s
                        JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
                        WHERE p.`sync_code` = ?");
    $s->execute([$code]);
    $row = $s->fetch();
    if (!$row) err('No synced profile found for this code', 404);

    json([
        'profile_uid' => $row['profile_uid'],
        'profile'     => json_decode((string)$row['snapshot'], true),
        'highscores'  => $row['scores'] !== null ? json_decode((string)$row['scores'], true) : null,
        'updated_at'  => $row['updated_at'],
    ]);
}

// ============================================================
// SCORES (with anti-cheat)
// ============================================================
function routeScores(array $parts, string $method, string $TP, string $TS, string $TL, string $TN): void {
    if ($method === 'POST' && !isset($parts[1])) { submitScore($TP, $TS, $TL, $TN); return; }
    if ($method === 'GET'  && ($parts[1] ?? '') === 'batch') { batchScores($TP, $TS); return; }
    err('Not found', 404);
}

function submitScore(string $TP, string $TS, string $TL, string $TN): void {
    $d = body();
    requireFields($d, ['profile_uid','song_hash','game_type','score','max_score']);
    $uid   = clean($d['profile_uid']);
    $hash  = clean($d['song_hash']);
    $v2Hash = isset($d['song_hash_v2']) ? clean($d['song_hash_v2']) : null;
    $gt    = $d['game_type'];
    $score = (int)$d['score'];
    $maxSc = (int)$d['max_score'];

    if (!isValidUUID($uid))      err('Invalid profile_uid');
    if (!isValidSongHash($hash))  err('Invalid song_hash (v1:hex)');
    if ($v2Hash !== null && !isValidSongHash($v2Hash)) err('Invalid song_hash_v2');
    if (!in_array($gt, ['s','d'])) err('game_type: s or d');
    if ($score < 0 || $maxSc < 1) err('Invalid score');

    // Profile must exist, be owned by the caller (sync_code), and opted in
    $p = db()->prepare("SELECT `show_on_board`, `sync_code` FROM `$TP` WHERE `profile_uid` = ?");
    $p->execute([$uid]);
    $prof = $p->fetch();
    if (!$prof) err('Profile not found — register first', 404);
    $providedCode = strtoupper(clean((string)($d['sync_code'] ?? '')));
    if ($providedCode === '' || $prof['sync_code'] === null
        || !hash_equals((string)$prof['sync_code'], $providedCode)) {
        err('Invalid or missing sync_code for this profile', 403);
    }
    if (!(int)$prof['show_on_board']) err('Profile opted out');

    // R72/A: anti-replay nonce — optional for scores (older deployed app
    // versions submit without one), but the server consumes it whenever
    // present: a duplicate nonce = replayed request → 409.
    consumeNonce(clean((string)($d['nonce'] ?? '')), false);

    $acc  = min(100, max(0, (float)($d['accuracy'] ?? 0)));
    $combo= (int)($d['max_combo'] ?? 0);
    $diff = in_array($d['difficulty'] ?? '', ['easy','normal','hard']) ? $d['difficulty'] : 'normal';
    $rat  = in_array($d['rating'] ?? '', ['perfect','excellent','good','okay','poor']) ? $d['rating'] : 'good';
    $hit  = (int)($d['notes_hit'] ?? 0);
    $miss = (int)($d['notes_missed'] ?? 0);

    // ── Anti-Cheat Verification ─────────────────────────────
    $proof     = $d['proof'] ?? null;
    $verified  = false;
    $acFlags   = [];
    $acReason  = null;

    if ($proof && is_array($proof)) {
        // Step 1: Verify integrity hash
        $integrityOk = verifyIntegrityHash($proof, [
            'score'       => $score,
            'accuracy'    => $acc,
            'max_combo'   => $combo,
            'notes_hit'   => $hit,
            'notes_missed'=> $miss,
            'difficulty'  => $diff,
        ]);

        // Step 2: Verify timestamp
        $timestampOk = verifyProofTimestamp($proof, 300); // 5 min window

        // Step 3: Plausibility checks
        $plausibility = verifyScorePlausibility($score, $maxSc, $acc, $combo, $hit, $miss, $proof);

        // Step 4: Check points_per_tick matches the client scoring model
        // (70/80% tick pool over the claimed note ticks)
        $pptOk = verifyPointsPerTick($proof, $maxSc);

        // Step 5: Detect soft flags
        $acFlags = flagSuspiciousScore($score, $acc, $combo, $hit, $miss, $proof);

        // Determine verification result
        if ($integrityOk && $timestampOk && $plausibility['valid'] && $pptOk) {
            $verified = true;
        } else {
            $reasons = [];
            if (!$integrityOk)  $reasons[] = 'integrity_hash_mismatch';
            if (!$timestampOk)   $reasons[] = 'proof_expired';
            if (!$plausibility['valid']) $reasons[] = $plausibility['reason'] ?? 'plausibility_fail';
            if (!$pptOk)        $reasons[] = 'ppt_mismatch';
            $acReason = implode('; ', $reasons);
        }
    }

    // If proof is completely missing, we still accept the score but mark unverified
    // This allows backwards compatibility during the v1→v2 transition

    // ── R72/A: statistical outlier soft-flag ────────────────────────
    // A profile younger than 24 h that instantly lands a Top-10 spot on a
    // song board with real competition. Not a rejection (a new player can
    // legitimately be a karaoke god) — the board shows a warning marker.
    $createdStmt = db()->prepare("SELECT `created_at` FROM `$TP` WHERE `profile_uid` = ?");
    $createdStmt->execute([$uid]);
    $createdAt = strtotime((string)$createdStmt->fetchColumn());
    if ($createdAt !== false && (time() - $createdAt) < 86400) {
        $probe = db()->prepare("SELECT COUNT(*) FROM `$TS` s
            JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
            WHERE (s.`song_hash` = ? OR s.`song_hash_v2` = ?) AND s.`game_type` = ?
              AND p.`show_on_board` = 1");
        $probe->execute([$hash, $hash, $gt]);
        $boardSize = (int)$probe->fetchColumn();
        if ($boardSize >= 5 && songRank($TS, $TP, $hash, $gt, $score) <= 10) {
            $acFlags[] = 'new_profile_top10';
        }
    }

    $flagsJson = !empty($acFlags) ? json_encode($acFlags, JSON_UNESCAPED_UNICODE) : null;

    // Determine fingerprint version
    $fpVersion = ($v2Hash !== null) ? 'v2' : 'v1';

    // New personal best = no existing row yet, or submitted score beats it.
    // Must be read BEFORE the upsert overwrites the row.
    $cur = db()->prepare("SELECT `score` FROM `$TS` WHERE `profile_uid` = ? AND `song_hash` = ? AND `game_type` = ?");
    $cur->execute([$uid, $hash, $gt]);
    $existingScore = $cur->fetchColumn();
    $isNewBest = ($existingScore === false) || ($score > (int)$existingScore);

    // UPSERT: keep higher score. R69: `played_at` marks when this score
    // value was achieved — only bump it when the submission became the
    // new best.
    // R78 NOTE: this explanation used to sit INSIDE the SQL string as
    // '// ...' lines — MySQL has no '//' comments (only '-- ', '#',
    // '/* */'), so the whole upsert died with 1064 and every POST /scores
    // 500ed since R69. PHP comments must never live inside a quoted SQL
    // string; they now stay outside, above the statement.
    $sql = "INSERT INTO `$TS`
        (`profile_uid`,`song_hash`,`song_hash_v2`,`game_type`,`score`,`max_score`,`accuracy`,`max_combo`,`difficulty`,`rating`,`notes_hit`,`notes_missed`,`verified`,`ac_flags`,`ac_reject_reason`,`fingerprint_version`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            `score`        = IF(VALUES(`score`) > `score`, VALUES(`score`), `score`),
            `max_score`    = IF(VALUES(`score`) > `score`, VALUES(`max_score`), `max_score`),
            `accuracy`     = IF(VALUES(`score`) > `score`, VALUES(`accuracy`), `accuracy`),
            `max_combo`    = IF(VALUES(`score`) > `score`, VALUES(`max_combo`), `max_combo`),
            `difficulty`   = IF(VALUES(`score`) > `score`, VALUES(`difficulty`), `difficulty`),
            `rating`       = IF(VALUES(`score`) > `score`, VALUES(`rating`), `rating`),
            `notes_hit`    = IF(VALUES(`score`) > `score`, VALUES(`notes_hit`), `notes_hit`),
            `notes_missed` = IF(VALUES(`score`) > `score`, VALUES(`notes_missed`), `notes_missed`),
            `played_at`    = IF(VALUES(`score`) > `score`, CURRENT_TIMESTAMP, `played_at`),
            `verified`     = IF(VALUES(`score`) > `score`, VALUES(`verified`), `verified`),
            `ac_flags`     = IF(VALUES(`score`) > `score`, VALUES(`ac_flags`), `ac_flags`),
            `ac_reject_reason` = IF(VALUES(`score`) > `score`, VALUES(`ac_reject_reason`), `ac_reject_reason`),
            `song_hash_v2`= IF(VALUES(`song_hash_v2`) IS NOT NULL, VALUES(`song_hash_v2`), `song_hash_v2`),
            `fingerprint_version` = IF(VALUES(`score`) > `score`, VALUES(`fingerprint_version`), `fingerprint_version`)";

    db()->prepare($sql)->execute([
        $uid,$hash,$v2Hash,$gt,$score,$maxSc,$acc,$combo,$diff,$rat,$hit,$miss,
        $verified ? 1 : 0, $flagsJson, $acReason, $fpVersion
    ]);

    db()->prepare("CALL sp_refresh_profile_stats(?)")->execute([$uid]);

    // R72/B+C: play log — one row per ACCEPTED submission (not just new
    // bests). Powers the month/week time-window boards and the
    // recent-plays list; pruned probabilistically below.
    db()->prepare("INSERT INTO `$TL` (`profile_uid`,`song_hash`,`game_type`,`score`,`accuracy`,`difficulty`)
            VALUES (?,?,?,?,?,?)")
        ->execute([$uid, $hash, $gt, $score, $acc, $diff]);

    // R72: probabilistic retention cleanup (~1 % of submissions) — play
    // log rows older than 400 days, nonces older than 1 day.
    if (random_int(1, 100) === 1) {
        try {
            db()->prepare("DELETE FROM `$TL` WHERE `created_at` < (NOW() - INTERVAL 400 DAY)")->execute();
            db()->prepare("DELETE FROM `$TN` WHERE `created_at` < (NOW() - INTERVAL 1 DAY)")->execute();
        } catch (Throwable) { /* non-critical */ }
    }

    // Calculate rank
    $rank = songRank($TS, $TP, $hash, $gt, $score);

    $response = ['ok'=>true, 'rank'=>$rank, 'is_new_best'=>$isNewBest, 'verified'=>$verified];
    if ($acReason) $response['verification_note'] = $acReason;
    if (!empty($acFlags)) $response['flags'] = $acFlags;
    json($response);
}

function batchScores(string $TP, string $TS): void {
    header('Cache-Control: public, max-age=30');
    $raw = $_GET['hashes'] ?? '';
    if (!$raw) err('Missing hashes parameter');
    $hashes = array_slice(array_unique(explode(',', $raw)), 0, 200);
    foreach ($hashes as $h) { if (!isValidSongHash($h)) err('Invalid hash: '.$h); }

    $gt    = in_array($_GET['game_type'] ?? 's', ['s','d']) ? $_GET['game_type'] : 's';
    $limit = min((int)($_GET['limit'] ?? 5000), 10000);

    $ph = implode(',', array_fill(0, count($hashes), '?'));
    // R72/E: dual-read — match v1 (song_hash) OR v2 (song_hash_v2)
    // fingerprints so future v2-only clients see the same boards.
    $sql = "SELECT
        s.`song_hash`, s.`profile_uid`, s.`score`, s.`max_score`, s.`accuracy`,
        s.`max_combo`, s.`difficulty`, s.`rating`, s.`played_at`,
        s.`verified`, s.`fingerprint_version`, s.`ac_flags`,
        p.`display_name`, p.`color`,
        IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
        FROM `$TS` s JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE (s.`song_hash` IN ($ph) OR s.`song_hash_v2` IN ($ph)) AND s.`game_type` = ? AND p.`show_on_board` = 1
        ORDER BY s.`score` DESC
        LIMIT $limit";
    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge($hashes, $hashes, [$gt]));
    $rows = $stmt->fetchAll();

    $result = []; $ranks = [];
    foreach ($rows as $row) {
        $h = $row['song_hash'];
        if (!isset($ranks[$h])) $ranks[$h] = 1;
        $row['rank'] = $ranks[$h]++;
        if (is_string($row['ac_flags'])) {
            $row['ac_flags'] = json_decode($row['ac_flags'], true);
        }
        $result[$h][] = $row;
    }
    json(['scores' => $result]);
}

// ============================================================
// LEADERBOARD
// ============================================================
function routeLeaderboard(array $parts, string $method, string $TP, string $TS, string $TL): void {
    if ($method !== 'GET') err('Method not allowed', 405);
    $type = $parts[1] ?? '';
    if ($type === 'global') { globalBoard($TP, $TL); return; }
    if ($type === 'song' && isset($parts[2])) { songBoard($parts[2], $TP, $TS); return; }
    if ($type === 'crowns') { crownsBoard($TP, $TS); return; }
    err('Unknown leaderboard type', 404);
}

/**
 * R72/B: start of a time window as a DATETIME string — calendar month /
 * ISO week (Monday) in the SERVER's timezone. 'all' → null (no cutoff).
 */
function windowCutoff(string $window): ?string {
    if ($window === 'month') return date('Y-m-01 00:00:00');
    if ($window === 'week') {
        $dow = (int)date('N'); // 1 = Monday … 7 = Sunday
        return date('Y-m-d 00:00:00', strtotime('-' . ($dow - 1) . ' days'));
    }
    return null;
}

/** R72/A: consume a client nonce (32 hex chars). Duplicate PK = replay → 409. */
function consumeNonce(string $nonce, bool $required): void {
    $TN = tbl('nonces');
    if ($nonce === '') {
        if ($required) err('Missing nonce (32 hex chars)');
        return;
    }
    if (!preg_match('/^[0-9a-f]{32}$/', $nonce)) err('Invalid nonce (32 hex chars)');
    try {
        db()->prepare("INSERT INTO `$TN` (`nonce`) VALUES (?)")->execute([$nonce]);
    } catch (PDOException) {
        err('Replay detected — nonce already used', 409);
    }
}

function globalBoard(string $TP, string $TL): void {
    // R69: boards tolerate a short browser cache — cuts repeated MySQL
    // queries when several components fetch the same board.
    header('Cache-Control: public, max-age=30');
    $limit  = min((int)($_GET['limit'] ?? 100), MAX_LEADERBOARD_ENTRIES);
    $offset = (int)($_GET['offset'] ?? 0);

    // R72/B: time windows + alternative sorts.
    $window = in_array($_GET['window'] ?? 'all', ['all','month','week'], true) ? $_GET['window'] : 'all';
    $sort   = in_array($_GET['sort'] ?? 'score', ['score','best','accuracy','plays'], true) ? $_GET['sort'] : 'score';
    $uid    = isset($_GET['uid']) ? clean((string)$_GET['uid']) : null;
    if ($uid !== null && !isValidUUID($uid)) $uid = null;

    $cutoff = windowCutoff($window);

    if ($cutoff === null) {
        // ── All-time board: cached profile columns (pre-v3.6 behaviour) ──
        $sortCol = match ($sort) {
            'best'     => 'best_score',
            'accuracy' => 'avg_accuracy',
            'plays'    => 'songs_played',
            default    => 'total_score',
        };
        $sql = "SELECT
            `profile_uid`,`display_name`,`color`,
            IF(`show_country`=1,`country_code`,NULL) AS `country_code`,
            `total_score`,`best_score`,`songs_played`,`games_played`,`avg_accuracy`,`br_wins`
            FROM `$TP`
            WHERE `show_on_board` = 1
            ORDER BY `$sortCol` DESC, `total_score` DESC
            LIMIT ? OFFSET ?";
        $stmt = db()->prepare($sql); $stmt->execute([$limit, $offset]);
        $rows = $stmt->fetchAll();

        $totalStmt = db()->prepare("SELECT COUNT(*) FROM `$TP` WHERE `show_on_board` = 1");
        $totalStmt->execute();
        $total = (int)$totalStmt->fetchColumn();

        // R72/C: the caller's own rank + percentile in the CURRENT sort
        $you = null;
        if ($uid !== null) {
            $mine = db()->prepare("SELECT `$sortCol` FROM `$TP` WHERE `profile_uid` = ? AND `show_on_board` = 1");
            $mine->execute([$uid]);
            $myVal = $mine->fetchColumn();
            if ($myVal !== false && $myVal !== null) {
                $better = db()->prepare("SELECT COUNT(*) FROM `$TP`
                    WHERE `show_on_board` = 1 AND `$sortCol` > ?");
                $better->execute([$myVal]);
                $rank = (int)$better->fetchColumn() + 1;
                $you = [
                    'rank'           => $rank,
                    'total'          => $total,
                    'percentile_top' => $total > 0 ? round($rank / $total * 100, 1) : null,
                ];
            }
        }
    } else {
        // ── Window board (month/week): aggregate the play log ──
        // v3.6.1: GROUP BY lists every non-aggregated ks_profiles column.
        // MySQL 8 derives them from the join on the PK, but MariaDB (netcup!)
        // has no functional-dependency detection (MDEV-11588) — with
        // ONLY_FULL_GROUP_BY the old `GROUP BY l.profile_uid` alone was
        // rejected. Semantics are identical: p.profile_uid is the PK, so
        // the extra columns can never merge two profiles.
        $sortAlias = match ($sort) {
            'best'     => 'window_best',
            'accuracy' => 'window_avg',
            'plays'    => 'window_plays',
            default    => 'window_score',
        };
        $sql = "SELECT
            l.`profile_uid`,
            SUM(l.`score`)               AS `total_score`,
            MAX(l.`score`)               AS `best_score`,
            COUNT(DISTINCT l.`song_hash`) AS `songs_played`,
            COUNT(*)                     AS `games_played`,
            ROUND(AVG(l.`accuracy`), 2)  AS `avg_accuracy`,
            SUM(l.`score`)               AS `window_score`,
            MAX(l.`score`)               AS `window_best`,
            ROUND(AVG(l.`accuracy`), 2)  AS `window_avg`,
            COUNT(*)                     AS `window_plays`,
            p.`display_name`, p.`color`, p.`br_wins`,
            IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
            FROM `$TL` l JOIN `$TP` p ON l.`profile_uid` = p.`profile_uid`
            WHERE l.`created_at` >= ? AND p.`show_on_board` = 1
            GROUP BY l.`profile_uid`, p.`profile_uid`, p.`display_name`, p.`color`,
                     p.`br_wins`, p.`show_country`, p.`country_code`
            ORDER BY `$sortAlias` DESC, `window_score` DESC
            LIMIT ? OFFSET ?";
        $stmt = db()->prepare($sql); $stmt->execute([$cutoff, $limit, $offset]);
        $rows = $stmt->fetchAll();

        $totalStmt = db()->prepare("SELECT COUNT(DISTINCT l.`profile_uid`) FROM `$TL` l
            JOIN `$TP` p ON l.`profile_uid` = p.`profile_uid`
            WHERE l.`created_at` >= ? AND p.`show_on_board` = 1");
        $totalStmt->execute([$cutoff]);
        $total = (int)$totalStmt->fetchColumn();

        $you = null;
        if ($uid !== null) {
            $mine = db()->prepare("SELECT
                SUM(l.`score`) AS s, MAX(l.`score`) AS b,
                AVG(l.`accuracy`) AS a, COUNT(*) AS c
                FROM `$TL` l JOIN `$TP` p ON l.`profile_uid` = p.`profile_uid`
                WHERE l.`created_at` >= ? AND p.`show_on_board` = 1 AND l.`profile_uid` = ?");
            $mine->execute([$cutoff, $uid]);
            $my = $mine->fetch();
            if ($my && $my['c'] !== null && (int)$my['c'] > 0) {
                $myVal = match ($sort) {
                    'best'     => $my['b'],
                    'accuracy' => $my['a'],
                    'plays'    => $my['c'],
                    default    => $my['s'],
                };
                $col = match ($sort) {
                    'best'     => 'b',
                    'accuracy' => 'a',
                    'plays'    => 'c',
                    default    => 's',
                };
                $better = db()->prepare("SELECT COUNT(*) + 1 FROM (
                    SELECT SUM(l2.`score`) AS s, MAX(l2.`score`) AS b,
                           AVG(l2.`accuracy`) AS a, COUNT(*) AS c
                    FROM `$TL` l2 JOIN `$TP` p2 ON l2.`profile_uid` = p2.`profile_uid`
                    WHERE l2.`created_at` >= ? AND p2.`show_on_board` = 1
                    GROUP BY l2.`profile_uid`) t
                    WHERE t.`$col` > ?");
                $better->execute([$cutoff, $myVal]);
                $rank = (int)$better->fetchColumn();
                $you = [
                    'rank'           => $rank,
                    'total'          => $total,
                    'percentile_top' => $total > 0 ? round($rank / $total * 100, 1) : null,
                ];
            }
        }
    }

    $r = $offset + 1;
    foreach ($rows as &$row) {
        $row['rank'] = $r++;
        // Aggregates may come back as strings depending on the driver.
        foreach (['total_score','best_score','songs_played','games_played','br_wins'] as $k) {
            if (isset($row[$k])) $row[$k] = (int)$row[$k];
        }
    }
    json([
        'window'        => $window,
        'sort'          => $sort,
        'total_players' => $total,
        'leaderboard'   => $rows,
        'you'           => $you,
    ]);
}

function songBoard(string $hash, string $TP, string $TS): void {
    header('Cache-Control: public, max-age=30');
    $hash = clean($hash);
    if (!isValidSongHash($hash)) err('Invalid song_hash');
    $gt    = in_array($_GET['game_type'] ?? 's', ['s','d']) ? $_GET['game_type'] : 's';
    // R72/B: real difficulty filter — the board shows only entries whose
    // (best) score was achieved on the selected difficulty. Default 'all'
    // keeps the pre-v3.6 behaviour.
    $diff  = in_array($_GET['difficulty'] ?? 'all', ['easy','normal','hard'], true) ? $_GET['difficulty'] : 'all';
    $limit = min((int)($_GET['limit'] ?? 100), MAX_LEADERBOARD_ENTRIES);
    $sql = "SELECT
        s.`profile_uid`, s.`score`, s.`max_score`, s.`accuracy`,
        s.`max_combo`, s.`difficulty`, s.`rating`, s.`played_at`,
        s.`verified`, s.`fingerprint_version`, s.`ac_flags`,
        p.`display_name`, p.`color`,
        IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
        FROM `$TS` s JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE (s.`song_hash` = ? OR s.`song_hash_v2` = ?) AND s.`game_type` = ? AND p.`show_on_board` = 1"
        . ($diff !== 'all' ? " AND s.`difficulty` = ?" : "") . "
        ORDER BY s.`score` DESC
        LIMIT ?";
    $params = [$hash, $hash, $gt];
    if ($diff !== 'all') $params[] = $diff;
    $params[] = $limit;
    $stmt = db()->prepare($sql); $stmt->execute($params);
    $rows = $stmt->fetchAll();
    $r = 1;
    foreach ($rows as &$row) {
        $row['rank'] = $r++;
        // R72/A: expose the soft flags so the UI can badge outliers.
        if (is_string($row['ac_flags'])) {
            $row['ac_flags'] = json_decode($row['ac_flags'], true);
        }
    }
    json(['song_hash' => $hash, 'game_type' => $gt, 'difficulty' => $diff, 'leaderboard' => $rows]);
}

/**
 * R72/C: song-#1 ("crown") count for a profile. A crown = the profile's
 * score on a song board (song_hash + game_type) equals that board's best
 * visible score — ties share the crown, exactly like the displayed
 * ranking. Opted-out profiles are invisible to the subquery, so their #1
 * falls to the next visible player (consistent with the song board).
 */
function crownsBoard(string $TP, string $TS): void {
    header('Cache-Control: public, max-age=30');
    $uid = clean((string)($_GET['uid'] ?? ''));
    if (!isValidUUID($uid)) err('Missing or invalid uid');

    $p = db()->prepare("SELECT `display_name` FROM `$TP` WHERE `profile_uid` = ? AND `show_on_board` = 1");
    $p->execute([$uid]);
    $name = $p->fetchColumn();
    if ($name === false) err('Profile not found or not visible', 404);

    $sql = "SELECT s.`song_hash`, s.`game_type`, s.`score`, s.`played_at`
        FROM `$TS` s
        WHERE s.`profile_uid` = ?
          AND s.`score` > 0
          AND s.`score` = (
              SELECT MAX(s2.`score`) FROM `$TS` s2
              JOIN `$TP` p2 ON s2.`profile_uid` = p2.`profile_uid`
              WHERE s2.`song_hash` = s.`song_hash`
                AND s2.`game_type` = s.`game_type`
                AND p2.`show_on_board` = 1
          )
        ORDER BY s.`played_at` DESC
        LIMIT 100";
    $s = db()->prepare($sql);
    $s->execute([$uid]);
    $rows = $s->fetchAll();
    json([
        'profile_uid'   => $uid,
        'display_name'  => $name,
        'crowns'        => count($rows),
        'songs'         => $rows,
    ]);
}

// ============================================================
// DAILY CHALLENGE
// ============================================================

/**
 * Valid daily challenge types (must match the client's DAILY_TYPE_LIST).
 * 'max' bound = plausibility ceiling for metric_value,
 * 'dir'      = ranking direction ('min' = lower is better, e.g. missed notes).
 */
function dailyTypeMeta(): array {
    return [
        // R69: 'score'-like metrics come from the standard 10,000-point
        // scoring model (MAX_POINTS_PER_SONG) — 100000 was pure sandbox.
        'score'           => ['max' => 10000,  'dir' => 'max'],
        'accuracy'        => ['max' => 100,    'dir' => 'max'],
        'combo'           => ['max' => 5000,   'dir' => 'max'],
        'perfect_notes'   => ['max' => 5000,   'dir' => 'max'],
        'golden_notes'    => ['max' => 2000,   'dir' => 'max'],
        'notes_hit'       => ['max' => 5000,   'dir' => 'max'],
        'tick_accuracy'   => ['max' => 100,    'dir' => 'max'],
        'clean_song'      => ['max' => 5000,   'dir' => 'min'],
        'comeback'        => ['max' => 5000,   'dir' => 'max'],
        'sharpshooter'    => ['max' => 100,    'dir' => 'max'],
        'combo_master'    => ['max' => 5000,   'dir' => 'max'],
        'perfect_storm'   => ['max' => 5000,   'dir' => 'max'],
        'endurance'       => ['max' => 5000,   'dir' => 'max'],
        'golden_groove'   => ['max' => 2000,   'dir' => 'max'],
        'precision'       => ['max' => 100,    'dir' => 'max'],
        'flawless_finale' => ['max' => 100,    'dir' => 'max'],
        'score_sniper'    => ['max' => 10000,  'dir' => 'max'],
        'combo_race'      => ['max' => 5000,   'dir' => 'max'],
        'perfect_pitch'   => ['max' => 5000,   'dir' => 'max'],
        'golden_fingers'  => ['max' => 2000,   'dir' => 'max'],
        'steady_hand'     => ['max' => 5000,   'dir' => 'min'],
        'titan'           => ['max' => 10000,  'dir' => 'max'],
    ];
}

function routeDaily(array $parts, string $method, string $TP, string $TD): void {
    if ($method === 'POST' && !isset($parts[1])) { submitDaily($TP, $TD); return; }
    if ($method === 'GET'  && !isset($parts[1])) { dailyBoard($TP, $TD); return; }
    err('Not found', 404);
}

function submitDaily(string $TP, string $TD): void {
    $d = body();
    requireFields($d, ['profile_uid','challenge_date','challenge_type','metric_value']);
    $uid  = clean((string)$d['profile_uid']);
    $type = clean((string)$d['challenge_type']);
    $date = clean((string)$d['challenge_date']);
    $diff = clean((string)($d['difficulty'] ?? 'normal'));

    if (!isValidUUID($uid)) err('Invalid profile_uid');
    $types = dailyTypeMeta();
    if (!isset($types[$type])) {
        err('challenge_type: unknown daily challenge variant');
    }
    if (!in_array($diff, ['easy','normal','hard','very_hard','insane'], true)) {
        err('difficulty: easy|normal|hard|very_hard|insane');
    }
    if (!isValidDateString($date)) err('Invalid challenge_date (YYYY-MM-DD)');

    // The challenge day must be current: no future dates, at most 7 days
    // back (allows late submission after offline play, blocks history
    // stuffing). ISO dates compare correctly as strings.
    $today    = date('Y-m-d');
    $earliest = date('Y-m-d', strtotime('-7 days'));
    if ($date > $today)    err('challenge_date is in the future');
    if ($date < $earliest) err('challenge_date too old (max 7 days back)');

    if (!is_numeric($d['metric_value'])) err('metric_value must be a number');
    $mv = round((float)$d['metric_value'], 2);
    if ($mv < 0 || $mv > $types[$type]['max']) err("metric_value out of range for challenge_type $type");

    // R69: realistic XP ceiling — the local daily system awards at most
    // ~54k XP in one day (365-day streak milestone 50000 + challenge/streak/
    // rank bonuses). 60000 keeps every legitimate value and cuts the old
    // 100000 sandbox in half.
    $xp = max(0, min(60000, (int)($d['xp_earned'] ?? 0)));

    // Profile must exist, be owned by the caller (sync_code), and opted in
    requireOwnership($uid, $d, $TP);
    $p = db()->prepare("SELECT `show_on_board` FROM `$TP` WHERE `profile_uid` = ?");
    $p->execute([$uid]);
    if (!(int)$p->fetchColumn()) err('Profile opted out');

    // UPSERT: same day + type keeps the better metric_value —
    // 'max' types keep the higher value, 'min' types (missed notes)
    // keep the lower one. xp follows the winning attempt; difficulty
    // reflects the latest submission (informational only).
    $better = ($types[$type]['dir'] === 'min')
        ? "IF(VALUES(`metric_value`) < `metric_value`, VALUES(`metric_value`), `metric_value`)"
        : "IF(VALUES(`metric_value`) > `metric_value`, VALUES(`metric_value`), `metric_value`)";
    db()->prepare("INSERT INTO `$TD`
            (`profile_uid`,`challenge_date`,`challenge_type`,`difficulty`,`metric_value`,`xp_earned`)
           VALUES (?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
               `metric_value` = $better,
               `xp_earned`    = IF(VALUES(`metric_value`) = `metric_value` AND VALUES(`xp_earned`) > `xp_earned`, VALUES(`xp_earned`), `xp_earned`),
               `difficulty`   = VALUES(`difficulty`)")
        ->execute([$uid, $date, $type, $diff, $mv, $xp]);

    json(['ok' => true]);
}

function dailyBoard(string $TP, string $TD): void {
    header('Cache-Control: public, max-age=30');
    $date = clean((string)($_GET['date'] ?? date('Y-m-d')));
    if (!isValidDateString($date)) err('Invalid date (YYYY-MM-DD)');
    $limit = max(1, min((int)($_GET['limit'] ?? 100), 100));
    $types = dailyTypeMeta();

    // One day of results is small (the unique key caps it at 22 rows per
    // profile — one per type); the SQL bound is only a hard safety cap.
    // Ranking per type happens in PHP so 'min' types (missed notes) can
    // sort ascending while everything else sorts descending.
    $sql = "SELECT
        r.`profile_uid`, r.`challenge_type`, r.`difficulty`, r.`metric_value`, r.`created_at`,
        p.`display_name`, p.`color`,
        IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
        FROM `$TD` r JOIN `$TP` p ON r.`profile_uid` = p.`profile_uid`
        WHERE r.`challenge_date` = ? AND p.`show_on_board` = 1
        ORDER BY r.`challenge_type` ASC, r.`metric_value` DESC, r.`created_at` ASC
        LIMIT " . (MAX_LEADERBOARD_ENTRIES * 8);
    $stmt = db()->prepare($sql);
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    // Group rows per challenge type, then rank each group by direction
    $groups = [];
    foreach ($rows as $row) {
        $groups[$row['challenge_type']][] = $row;
    }

    $board = [];
    foreach ($groups as $t => $group) {
        $dir = $types[$t]['dir'] ?? 'max';
        usort($group, function (array $a, array $b) use ($dir): int {
            if ((float)$a['metric_value'] === (float)$b['metric_value']) return 0;
            $cmp = (float)$a['metric_value'] <=> (float)$b['metric_value'];
            return $dir === 'min' ? $cmp : -$cmp;
        });
        $seen = 0;
        foreach ($group as $row) {
            $seen++;
            if ($seen > $limit) break; // per-type Top-N
            $board[] = [
                'rank'           => $seen,
                'profile_uid'    => $row['profile_uid'],
                'display_name'   => $row['display_name'],
                'color'          => $row['color'],
                'country_code'   => $row['country_code'],
                'challenge_type' => $t,
                'difficulty'     => $row['difficulty'],
                'metric_value'   => (float)$row['metric_value'],
                'created_at'     => str_replace(' ', 'T', (string)$row['created_at']),
            ];
        }
    }
    json(['date' => $date, 'leaderboard' => $board]);
}

/**
 * R72/C: GET /profiles/{uid}/plays — the most recent online rounds from
 * the play log (newest first). Only song fingerprints + numbers — the
 * client maps hashes to local song titles; the server never stores any.
 * Only visible (show_on_board=1) profiles are exposed.
 */
function recentPlays(string $uid, string $TP, string $TL): void {
    header('Cache-Control: public, max-age=30');
    if (!isValidUUID($uid)) err('Invalid profile_uid');
    $p = db()->prepare("SELECT `show_on_board` FROM `$TP` WHERE `profile_uid` = ?");
    $p->execute([$uid]);
    $vis = $p->fetchColumn();
    if ($vis === false) err('Profile not found', 404);
    if (!(int)$vis) err('Profile not visible', 403);

    $limit = max(1, min((int)($_GET['limit'] ?? 20), 50));
    $s = db()->prepare("SELECT `song_hash`, `game_type`, `score`, `accuracy`, `difficulty`, `created_at`
        FROM `$TL` WHERE `profile_uid` = ? ORDER BY `id` DESC LIMIT ?");
    $s->execute([$uid, $limit]);
    $rows = $s->fetchAll();
    foreach ($rows as &$row) {
        $row['created_at'] = str_replace(' ', 'T', (string)$row['created_at']);
    }
    json(['profile_uid' => $uid, 'plays' => $rows]);
}

// ============================================================
// BATTLE ROYALE (R72/D: online win counter)
// ============================================================
/**
 * POST /br — submit a Battle-Royale result. BR has no comparable score
 * scale (rounds × players), so only WINS are counted — br_wins on the
 * profile doubles as the board column (sort=plays is NOT it; the client
 * surfaces it as its own stat / the global rows carry br_wins).
 *
 * Anti-abuse: (1) the sync_code proves ownership, (2) a 32-hex nonce is
 * REQUIRED (a replayed request must never increment a counter twice),
 * (3) two counted wins must be ≥ 120 s apart — a full BR round takes
 * minutes; the atomic UPDATE enforces the interval without a race.
 */
function routeBr(string $method, string $TP): void {
    if ($method !== 'POST') err('Method not allowed', 405);
    $d = body();
    requireFields($d, ['profile_uid', 'sync_code', 'won', 'nonce']);
    $uid = clean((string)$d['profile_uid']);
    if (!isValidUUID($uid)) err('Invalid profile_uid');

    requireOwnership($uid, $d, $TP);

    $p = db()->prepare("SELECT `show_on_board` FROM `$TP` WHERE `profile_uid` = ?");
    $p->execute([$uid]);
    if (!(int)$p->fetchColumn()) err('Profile opted out');

    // Counter write → nonce is mandatory (see docblock).
    consumeNonce(clean((string)$d['nonce']), true);

    if (!filter_var($d['won'], FILTER_VALIDATE_BOOLEAN)) {
        // A loss is accepted (and the nonce burned) but never counted.
        json(['ok' => true, 'counted' => false]);
    }

    $upd = db()->prepare("UPDATE `$TP` SET `br_wins` = `br_wins` + 1, `br_wins_at` = NOW()
        WHERE `profile_uid` = ?
          AND (`br_wins_at` IS NULL OR `br_wins_at` < (NOW() - INTERVAL 120 SECOND))");
    $upd->execute([$uid]);
    $counted = $upd->rowCount() === 1;

    $cur = db()->prepare("SELECT `br_wins` FROM `$TP` WHERE `profile_uid` = ?");
    $cur->execute([$uid]);
    json(['ok' => true, 'counted' => $counted, 'br_wins' => (int)$cur->fetchColumn()]);
}

// ============================================================
// HEALTH / DIAGNOSTICS (v3.6.1)
// ============================================================
/**
 * GET /health — one-shot deployment diagnostics behind the API key.
 *
 * Background: the top-level catch-all only ever says "Database error"
 * (HTTP 500) — that is correct for the app, but useless for the admin.
 * After a fresh-install report ("all 7 tables exist, yet the time-window
 * board 500s"), /health names the exact cause:
 *
 *   - DB connection refused (config.local.php credentials after a
 *     database rebuild / new password)
 *   - tables created in a DIFFERENT database than DB_NAME points to
 *   - tables exist, but individual columns are missing (e.g. an old
 *     ks_profiles without br_wins/br_wins_at from a partial migration)
 *   - sync_code still CHAR(8) (12-char codes would be rejected/truncated)
 *   - stored procedure sp_refresh_profile_stats missing (phpMyAdmin
 *     DELIMITER block skipped) — POST /scores would 500
 *   - the real board queries (all-time + month + week) executed live,
 *     with the exact PDO error message if one of them throws
 *
 * Every finding comes with a ready-to-run statement in `fixes`.
 * The response describes the schema, so it must stay behind the key.
 */
function apiHealth(string $TP, string $TS, string $TD, string $TA, string $TL, string $TN): void {
    header('Cache-Control: no-store');
    $version = '3.6.2';
    $problems = [];
    $fixes    = [];

    // ── 1. DB connection (the /info endpoint never touches the DB, so a
    //       broken credential pair only shows up here) ─────────────────
    $dbInfo = null;
    try {
        $pdo = db();
        $dbName = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
        $dbInfo = [
            'connected'     => true,
            'server'        => (string)$pdo->query('SELECT VERSION()')->fetchColumn(),
            'database_name' => $dbName,
            'sql_mode'      => (string)$pdo->query('SELECT @@sql_mode')->fetchColumn(),
        ];
    } catch (PDOException $e) {
        json([
            'api_version' => $version,
            'php_version' => PHP_VERSION,
            'ok'          => false,
            'database'    => ['connected' => false, 'pdo_error' => $e->getMessage()],
            'problems'    => [
                'DB-Verbindung fehlgeschlagen: DB_HOST/DB_NAME/DB_USER/DB_PASS in config.local.php '
                . 'pruefen. WICHTIG (Vorfall 18.11.): DB_HOST=localhost verbindet auf netcup '
                . 'ueber den Unix-Socket mit einer ANDEREN MySQL-Instanz als der Plesk-DB — '
                . 'stattdessen den Plesk-Hostnamen eintragen (z.B. mysqle88c.netcup.net). '
                . 'PDO meldet: ' . $e->getMessage(),
            ],
            'fixes' => [],
        ]);
    }

    // ── 2. Required tables + columns (column list = everything the API
    //       actually references in its SQL, with exact ADD COLUMN fixes) ──
    $T_SYNC = tbl('profile_sync');
    $spec = [
        $TP => [
            'profile_uid'   => 'VARCHAR(36) NOT NULL',
            'display_name'  => 'VARCHAR(64) NOT NULL',
            'color'         => "VARCHAR(7) NOT NULL DEFAULT '#8B5CF6'",
            'country_code'  => 'CHAR(2) NULL DEFAULT NULL',
            'show_on_board' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'show_country'  => 'TINYINT(1) NOT NULL DEFAULT 1',
            'sync_code'     => 'VARCHAR(16) NULL DEFAULT NULL',
            'br_wins'       => 'INT NOT NULL DEFAULT 0',
            'br_wins_at'    => 'DATETIME NULL DEFAULT NULL',
            'total_score'   => 'BIGINT NOT NULL DEFAULT 0',
            'best_score'    => 'INT NOT NULL DEFAULT 0',
            'songs_played'  => 'INT NOT NULL DEFAULT 0',
            'games_played'  => 'INT NOT NULL DEFAULT 0',
            'avg_accuracy'  => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'created_at'    => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at'    => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ],
        $TS => [
            'id'                  => 'BIGINT NOT NULL AUTO_INCREMENT',
            'profile_uid'         => 'VARCHAR(36) NOT NULL',
            'song_hash'           => 'VARCHAR(80) NOT NULL',
            'song_hash_v2'        => 'VARCHAR(80) NULL DEFAULT NULL',
            'game_type'           => "ENUM('s','d') NOT NULL",
            'score'               => 'INT NOT NULL',
            'max_score'           => 'INT NOT NULL DEFAULT 10000',
            'accuracy'            => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'max_combo'           => 'INT NOT NULL DEFAULT 0',
            'difficulty'          => "ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal'",
            'rating'              => "ENUM('perfect','excellent','good','okay','poor') NOT NULL DEFAULT 'good'",
            'notes_hit'           => 'INT NOT NULL DEFAULT 0',
            'notes_missed'        => 'INT NOT NULL DEFAULT 0',
            'verified'            => 'TINYINT(1) NOT NULL DEFAULT 0',
            'ac_flags'            => 'JSON NULL DEFAULT NULL',
            'ac_reject_reason'    => 'VARCHAR(255) NULL DEFAULT NULL',
            'fingerprint_version' => "ENUM('v1','v2') NOT NULL DEFAULT 'v1'",
            'played_at'           => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'created_at'          => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ],
        $TD => [
            'id'             => 'BIGINT NOT NULL AUTO_INCREMENT',
            'profile_uid'    => 'VARCHAR(36) NOT NULL',
            'challenge_date' => 'DATE NOT NULL',
            'challenge_type' => 'VARCHAR(40) NOT NULL',
            'difficulty'     => "VARCHAR(12) NOT NULL DEFAULT 'normal'",
            'metric_value'   => 'DECIMAL(10,2) NOT NULL',
            'xp_earned'      => 'INT NOT NULL DEFAULT 0',
            'created_at'     => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at'     => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ],
        $TA => [
            'id'              => 'BIGINT NOT NULL AUTO_INCREMENT',
            'email'           => 'VARCHAR(254) NOT NULL',
            'password_hash'   => 'VARCHAR(255) NOT NULL',
            'recovery_hash'   => 'VARCHAR(255) NULL DEFAULT NULL',
            'profile_uid'     => 'VARCHAR(36) NOT NULL',
            'failed_attempts' => 'INT NOT NULL DEFAULT 0',
            'locked_until'    => 'DATETIME NULL DEFAULT NULL',
            'created_at'      => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at'      => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ],
        $TL => [
            'id'          => 'BIGINT NOT NULL AUTO_INCREMENT',
            'profile_uid' => 'VARCHAR(36) NOT NULL',
            'song_hash'   => 'VARCHAR(80) NOT NULL',
            'game_type'   => "ENUM('s','d') NOT NULL",
            'score'       => 'INT NOT NULL',
            'accuracy'    => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'difficulty'  => "ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal'",
            'created_at'  => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ],
        $TN => [
            'nonce'      => 'CHAR(32) NOT NULL',
            'created_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
        ],
        $T_SYNC => [
            'profile_uid' => 'VARCHAR(36) NOT NULL',
            'snapshot'    => 'JSON NOT NULL',
            'scores'      => 'JSON NULL DEFAULT NULL',
            'updated_at'  => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ],
    ];

    $tablesOut = [];
    foreach ($spec as $table => $columns) {
        $entry = ['exists' => false];
        try {
            $q = $pdo->prepare(
                'SELECT COUNT(*) FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
            $q->execute([$table]);
            $entry['exists'] = ((int)$q->fetchColumn()) === 1;

            if (!$entry['exists']) {
                $problems[] = "Tabelle `$table` fehlt in Datenbank `$dbName` — "
                    . 'entweder das komplette schema.sql importieren (leere DB! enthaelt DROP TABLE) '
                    . 'oder bei einer bestehenden Installation den passenden Migrationsblock aus '
                    . 'docs/LEADERBOARD-SETUP.md / schema.sql ausfuehren.';
                $fixes[] = "-- Tabelle $table anlegen: CREATE-Block aus schema.sql (bzw. Migrationsblock v3.5 -> v3.6)";
                continue;
            }

            // Columns present? (+ max length where it matters)
            $q = $pdo->prepare(
                'SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
                   FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
            $q->execute([$table]);
            $present = [];
            foreach ($q->fetchAll() as $c) {
                $present[$c['COLUMN_NAME']] = $c['CHARACTER_MAXIMUM_LENGTH'];
            }
            $missing = [];
            foreach ($columns as $col => $def) {
                if (!array_key_exists($col, $present)) {
                    $missing[] = $col;
                    $fixes[] = "ALTER TABLE `$table` ADD COLUMN `$col` $def;";
                }
            }
            $entry['missing_columns'] = $missing;
            if ($missing) {
                $problems[] = "Tabelle `$table` existiert, aber es fehlen Spalten: "
                    . implode(', ', $missing) . ' — Statements dazu stehen in `fixes`.';
            }

            // sync_code must hold 12-char codes since v3.6 (legacy 8 stays valid)
            if ($table === $TP && array_key_exists('sync_code', $present)
                && $present['sync_code'] !== null && (int)$present['sync_code'] < 16) {
                $problems[] = 'ks_profiles.sync_code ist nur ' . $present['sync_code']
                    . ' Zeichen breit — seit v3.6 sind neue Codes 12 Zeichen (60 Bit Entropie). '
                    . 'Alte 8-Zeichen-Codes bleiben gueltig, aber Registrierungen mit 12-Zeichen-Code schlagen fehl.';
                $fixes[] = 'ALTER TABLE `' . $TP . '` MODIFY `sync_code` VARCHAR(16) NULL DEFAULT NULL;';
            }

            // Readable + row count (cheap full-table probe)
            $entry['row_count'] = (int)$pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        } catch (PDOException $e) {
            $entry['error'] = $e->getMessage();
            $problems[] = "Pruefung von `$table` schlug fehl: " . $e->getMessage();
        }
        $tablesOut[$table] = $entry;
    }

    // ── 3. Stored procedure (missing => POST /scores would 500) ──────
    $procOk = false;
    try {
        $q = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.ROUTINES
              WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'sp_refresh_profile_stats'");
        $q->execute();
        $procOk = ((int)$q->fetchColumn()) === 1;
        if (!$procOk) {
            $problems[] = 'Stored Procedure `sp_refresh_profile_stats` fehlt — Score-Uploads '
                . '(POST /scores) wuerden mit 500 fehlschlagen. In phpMyAdmin den Abschnitt '
                . '"Stored Procedure" aus schema.sql ausfuehren (inkl. DELIMITER-Zeilen).';
            $fixes[] = "-- sp_refresh_profile_stats anlegen: 'Stored Procedure'-Block aus schema.sql (DELIMITER // ... // DELIMITER ;)";
        }
    } catch (PDOException $e) {
        $problems[] = 'Pruefung der Stored Procedure schlug fehl: ' . $e->getMessage();
    }

    // ── 4. Live board queries — the exact statements globalBoard() runs,
    //       so a 500 reproduces HERE with the real MySQL error message ──
    $queries = [];
    $probes = [
        'board_all_time' => "SELECT `profile_uid`,`display_name`,`color`,
                IF(`show_country`=1,`country_code`,NULL) AS `country_code`,
                `total_score`,`best_score`,`songs_played`,`games_played`,`avg_accuracy`,`br_wins`
            FROM `$TP`
            WHERE `show_on_board` = 1
            ORDER BY `total_score` DESC, `total_score` DESC
            LIMIT 1 OFFSET 0",
        'board_window_month' => "SELECT
                l.`profile_uid`,
                SUM(l.`score`)               AS `total_score`,
                MAX(l.`score`)               AS `best_score`,
                COUNT(DISTINCT l.`song_hash`) AS `songs_played`,
                COUNT(*)                     AS `games_played`,
                ROUND(AVG(l.`accuracy`), 2)  AS `avg_accuracy`,
                SUM(l.`score`)               AS `window_score`,
                p.`display_name`, p.`color`, p.`br_wins`,
                IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
            FROM `$TL` l JOIN `$TP` p ON l.`profile_uid` = p.`profile_uid`
            WHERE l.`created_at` >= ? AND p.`show_on_board` = 1
            GROUP BY l.`profile_uid`, p.`profile_uid`, p.`display_name`, p.`color`,
                     p.`br_wins`, p.`show_country`, p.`country_code`
            ORDER BY `window_score` DESC, `window_score` DESC
            LIMIT 1 OFFSET 0",
        'board_window_week' => "SELECT
                l.`profile_uid`,
                SUM(l.`score`)               AS `total_score`,
                MAX(l.`score`)               AS `best_score`,
                COUNT(DISTINCT l.`song_hash`) AS `songs_played`,
                COUNT(*)                     AS `games_played`,
                ROUND(AVG(l.`accuracy`), 2)  AS `avg_accuracy`,
                SUM(l.`score`)               AS `window_score`,
                p.`display_name`, p.`color`, p.`br_wins`,
                IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
            FROM `$TL` l JOIN `$TP` p ON l.`profile_uid` = p.`profile_uid`
            WHERE l.`created_at` >= ? AND p.`show_on_board` = 1
            GROUP BY l.`profile_uid`, p.`profile_uid`, p.`display_name`, p.`color`,
                     p.`br_wins`, p.`show_country`, p.`country_code`
            ORDER BY `window_score` DESC, `window_score` DESC
            LIMIT 1 OFFSET 0",
    ];
    $cutoffs = [
        'board_all_time'     => [],
        'board_window_month' => [date('Y-m-01 00:00:00')],
        'board_window_week'  => [date('Y-m-d 00:00:00', strtotime('-' . ((int)date('N') - 1) . ' days'))],
    ];
    foreach ($probes as $name => $sql) {
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($cutoffs[$name]);
            $queries[$name] = ['ok' => true, 'rows' => count($stmt->fetchAll())];
        } catch (PDOException $e) {
            $queries[$name] = ['ok' => false, 'error' => $e->getMessage()];
            $problems[] = "Query `$name` schlaegt fehl: " . $e->getMessage();
        }
    }

    // ── 5. Write-path probe (R77): actually CALL the stored procedure with
    //       a UID that matches no profile (all-zero UUID). The UPDATE inside
    //       affects 0 rows — this is harmless, and it is the ONLY way to
    //       verify executability: information_schema says "exists", but the
    //       CALL can still fail with definer/privilege errors (1449/1370),
    //       which would 500 every POST /scores on a fresh install.
    try {
        $procStmt = $pdo->prepare('CALL sp_refresh_profile_stats(?)');
        $procStmt->execute(['00000000-0000-4000-8000-000000000000']);
        $queries['proc_call'] = ['ok' => true];
    } catch (PDOException $e) {
        $queries['proc_call'] = ['ok' => false, 'error' => $e->getMessage()];
        $problems[] = 'CALL sp_refresh_profile_stats schlaegt fehl (POST /scores wuerde 500en): '
            . $e->getMessage()
            . ' — haeufige Ursachen: DEFINER existiert nicht mehr (Drop+CREATE der Procedure in phpMyAdmin fixt es) '
            . 'oder dem DB-User fehlt EXECUTE (Plesk → Datenbankbenutzer → Rechte).';
        $fixes[] = 'DROP PROCEDURE IF EXISTS `sp_refresh_profile_stats`; CREATE PROCEDURE `sp_refresh_profile_stats`(IN p_uid VARCHAR(36)) BEGIN ... END -- voller Body aus schema.sql';
    }

    json([
        'api_version'  => $version,
        'php_version'  => PHP_VERSION,
        'ok'           => $problems === [],
        'database'     => $dbInfo,
        'tables'       => $tablesOut,
        'procedure'    => ['sp_refresh_profile_stats' => $procOk],
        'queries'      => $queries,
        'problems'     => $problems,
        'fixes'        => $fixes,
    ]);
}

// ============================================================
// HELPERS
// ============================================================
function songRank(string $TS, string $TP, string $hash, string $gt, int $score): int {
    // R72/E: dual-read — the board identity is the v1 hash, but a v2-only
    // lookup must find the same rows.
    $sql = "SELECT COUNT(*)+1 FROM `$TS` s
        JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE (s.`song_hash` = ? OR s.`song_hash_v2` = ?) AND s.`game_type` = ? AND p.`show_on_board` = 1 AND s.`score` > ?";
    $stmt = db()->prepare($sql);
    $stmt->execute([$hash, $hash, $gt, $score]);
    return (int)$stmt->fetchColumn();
}

/** Validate that a YYYY-MM-DD string is a real calendar date. */
function isValidDateString(string $s): bool {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m)) return false;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

// ============================================================
// AUTH (app-only online accounts: e-mail + password)
// ============================================================
function routeAuth(array $parts, string $method, string $TP, string $TA): void {
    $action = $parts[1] ?? null;
    if ($method === 'POST' && $action === 'register') { authRegister($TP, $TA); return; }
    if ($method === 'POST' && $action === 'login')    { authLogin($TP, $TA);    return; }
    if ($method === 'POST' && $action === 'password') { authPassword($TP, $TA); return; }
    if ($method === 'POST' && $action === 'recover')  { authRecover($TP, $TA);  return; }
    err('Not found', 404);
}

/** Normalize an e-mail for storage/lookup: trim + lowercase. */
function normalizeEmail($raw): string {
    return strtolower(trim(clean((string)$raw)));
}

/** Validate the shared password policy (8-128 chars). */
function assertPasswordPolicy(string $pw): void {
    $len = strlen($pw);
    if ($len < 8 || $len > 128) err('Password must be 8-128 characters');
}

// Fixed bcrypt hash of an unguessable random string. Verifying against it
// keeps the timing of "unknown e-mail" answers identical to wrong passwords
// (blunts user enumeration).
const AUTH_DUMMY_HASH = '$2y$10$Xk5ZbG9QhU3wJmRtYs8CeOuNqPfLdAzWxVbKnMgSjHqEiCyT1oUa4m';

// ============================================================
// RECOVERY CODES (R69)
// ============================================================

/**
 * Recovery-code alphabet: 32 unambiguous chars (no 0/O, 1/I).
 * 16 positions → 80 bits of entropy — brute-forcing the code through
 * /auth/recover is infeasible even without the login lockout.
 */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_LENGTH = 16;

/** Generate a fresh recovery code (raw, 16 chars, no separators). */
function generateRecoveryCode(): string {
    $code = '';
    for ($i = 0; $i < RECOVERY_LENGTH; $i++) {
        $code .= RECOVERY_ALPHABET[random_int(0, strlen(RECOVERY_ALPHABET) - 1)];
    }
    return $code;
}

/** Normalize a user-entered recovery code: strip separators, uppercase. */
function normalizeRecoveryCode($raw): string {
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$raw));
}

// Note: no format pre-check before the bcrypt verify — a fail-fast check on
// the code format would create a timing side channel that reveals whether an
// e-mail exists (known account + malformed code answers in ~0 ms, unknown
// e-mail always pays the dummy bcrypt). password_verify() handles any input.

/** bcrypt-hash a recovery code for storage. */
function hashRecoveryCode(string $code): string {
    $h = password_hash($code, PASSWORD_BCRYPT);
    if ($h === false) err('Could not hash recovery code', 500);
    return $h;
}

/** Format a raw code for display: XXXX-XXXX-XXXX-XXXX. */
function formatRecoveryCode(string $code): string {
    return implode('-', str_split($code, 4));
}

/**
 * Ensure the account has a recovery code. Returns the PLAIN code when one
 * had to be generated (first issue), or null when a hash already exists
 * (existing codes are never re-revealed — single display by design).
 */
function ensureRecoveryCode(array $acc, string $TA): ?string {
    if ($acc['recovery_hash'] !== null && $acc['recovery_hash'] !== '') return null;
    $code = generateRecoveryCode();
    db()->prepare("UPDATE `$TA` SET `recovery_hash` = ? WHERE `id` = ?")
        ->execute([hashRecoveryCode($code), $acc['id']]);
    return $code;
}

/**
 * POST /auth/register — link an e-mail + password account to a profile.
 * The caller must prove ownership of the profile via its sync_code.
 *
 * R69: if the profile ALREADY has a linked account, the caller may replace
 * it (delete + re-insert) — this is the forgot-password rescue path for
 * users who saved their sync code but neither the password nor the recovery
 * code. Replacing stays within the sync_code trust level: anyone holding
 * the sync_code can already delete the whole profile, so replacing only the
 * account grants no new capability.
 *
 * A one-time recovery code is generated and returned — the client shows it
 * exactly once; only its bcrypt hash is stored.
 */
function authRegister(string $TP, string $TA): void {
    $d = body();
    requireFields($d, ['email', 'password', 'sync_code']);
    $email = normalizeEmail($d['email']);
    $pw    = (string)$d['password'];
    $code  = strtoupper(clean((string)$d['sync_code']));
    if (!isValidSyncCode($code)) err('Invalid sync_code (8 chars A-Z0-9)');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
        err('Invalid e-mail address');
    }
    assertPasswordPolicy($pw);

    // The sync_code must belong to an existing profile (ownership proof)
    $cur = db()->prepare("SELECT `profile_uid` FROM `$TP` WHERE `sync_code` = ?");
    $cur->execute([$code]);
    $uid = $cur->fetchColumn();
    if ($uid === false || $uid === null) err('Profile not found', 404);

    // One account per e-mail — EXCEPT when that account belongs to the very
    // profile being re-registered (replace flow re-uses the same e-mail).
    $dup = db()->prepare("SELECT `profile_uid` FROM `$TA` WHERE `email` = ?");
    $dup->execute([$email]);
    $dupUid = $dup->fetchColumn();
    if ($dupUid !== false && $dupUid !== null && $dupUid !== $uid) {
        err('E-mail already registered', 409);
    }

    // One account per profile: on re-register (sync_code proven), the old
    // account row is replaced. Lockout counters start fresh for the new
    // credentials — acceptable, the caller holds the sync_code anyway.
    $dup2 = db()->prepare("SELECT `id` FROM `$TA` WHERE `profile_uid` = ?");
    $dup2->execute([$uid]);
    $oldAccountId = $dup2->fetchColumn();
    if ($oldAccountId !== false && $oldAccountId !== null) {
        db()->prepare("DELETE FROM `$TA` WHERE `id` = ?")->execute([$oldAccountId]);
    }

    $hash = password_hash($pw, PASSWORD_BCRYPT);
    if ($hash === false) err('Could not hash password', 500);
    $recoveryCode = generateRecoveryCode();
    db()->prepare("INSERT INTO `$TA` (`email`,`password_hash`,`recovery_hash`,`profile_uid`) VALUES (?,?,?,?)")
        ->execute([$email, $hash, hashRecoveryCode($recoveryCode), $uid]);
    json([
        'ok'            => true,
        'profile_uid'   => $uid,
        'recovery_code' => formatRecoveryCode($recoveryCode),
    ]);
}

/** Fetch an account row by e-mail. */
function fetchAccount(string $email, string $TA): array|null {
    $cur = db()->prepare(
        "SELECT `id`,`password_hash`,`recovery_hash`,`profile_uid`,`failed_attempts`,`locked_until`
         FROM `$TA` WHERE `email` = ?"
    );
    $cur->execute([$email]);
    $row = $cur->fetch();
    return $row === false ? null : $row;
}

/** True when the account is currently locked out. */
function isLocked(array $acc): bool {
    return $acc['locked_until'] !== null
        && strtotime((string)$acc['locked_until']) !== false
        && strtotime((string)$acc['locked_until']) > time();
}

/** Count a failed attempt; lock for 15 minutes from the 5th failure on. */
function countFailedLogin(array $acc, string $TA): void {
    $fails  = (int)$acc['failed_attempts'] + 1;
    $locked = $fails >= 5 ? date('Y-m-d H:i:s', time() + 900) : null;
    db()->prepare("UPDATE `$TA` SET `failed_attempts` = ?, `locked_until` = ? WHERE `id` = ?")
        ->execute([$fails, $locked, $acc['id']]);
}

/** Reset the failure counters after a successful login. */
function resetFailedLogin(array $acc, string $TA): void {
    if ((int)$acc['failed_attempts'] !== 0 || $acc['locked_until'] !== null) {
        db()->prepare("UPDATE `$TA` SET `failed_attempts` = 0, `locked_until` = NULL WHERE `id` = ?")
            ->execute([$acc['id']]);
    }
}

/**
 * POST /auth/login — verify e-mail + password. On success the profile's
 * sync_code is returned so the client can pull its sync snapshot via the
 * existing GET /profiles/sync/{code} endpoint (same trust level: the
 * password is bound 1:1 to that profile). Responses are deliberately
 * generic to avoid e-mail enumeration.
 *
 * R69: accounts created before v3.5.0 have no recovery code — one is
 * generated and returned here (exactly once) so legacy users can save it.
 */
function authLogin(string $TP, string $TA): void {
    $d = body();
    requireFields($d, ['email', 'password']);
    $email = normalizeEmail($d['email']);
    $pw    = (string)$d['password'];

    $acc = fetchAccount($email, $TA);
    if ($acc === null) {
        password_verify($pw, AUTH_DUMMY_HASH); // equalize timing
        usleep(300000);
        err('Invalid e-mail or password', 401);
    }
    if (isLocked($acc)) {
        err('Too many failed attempts — try again later', 429);
    }
    if (!password_verify($pw, (string)$acc['password_hash'])) {
        countFailedLogin($acc, $TA);
        usleep(300000);
        err('Invalid e-mail or password', 401);
    }
    resetFailedLogin($acc, $TA);

    $cur = db()->prepare("SELECT `sync_code` FROM `$TP` WHERE `profile_uid` = ?");
    $cur->execute([$acc['profile_uid']]);
    $code = $cur->fetchColumn();
    if ($code === false || $code === null) err('Profile not found', 404);

    $response = ['ok' => true, 'profile_uid' => $acc['profile_uid'], 'sync_code' => (string)$code];

    // R69: legacy account without a stored recovery code → issue one now.
    // The client surfaces it in a save-this-code dialog. Existing codes are
    // never re-revealed (ensureRecoveryCode returns null when a hash exists).
    $issued = ensureRecoveryCode($acc, $TA);
    if ($issued !== null) $response['recovery_code'] = formatRecoveryCode($issued);

    json($response);
}

/**
 * POST /auth/recover — reset a forgotten password with the one-time
 * recovery code (R69). Requires e-mail + recovery code + new password.
 *
 * Flow: verify the recovery code against its bcrypt hash (with the same
 * lockout counting as login), then set the new password AND rotate to a
 * fresh recovery code (single-use by design — the used code dies here).
 * The NEW recovery code is returned so the client can show it once.
 */
function authRecover(string $TP, string $TA): void {
    $d = body();
    requireFields($d, ['email', 'recovery_code', 'new_password']);
    $email = normalizeEmail($d['email']);
    $rc    = normalizeRecoveryCode($d['recovery_code']);
    $newPw = (string)$d['new_password'];
    assertPasswordPolicy($newPw);

    $acc = fetchAccount($email, $TA);
    if ($acc === null) {
        password_verify($rc, AUTH_DUMMY_HASH); // equalize timing
        usleep(300000);
        err('Invalid e-mail or recovery code', 401);
    }
    if (isLocked($acc)) {
        err('Too many failed attempts — try again later', 429);
    }
    if ($acc['recovery_hash'] === null || $acc['recovery_hash'] === ''
        || !password_verify($rc, (string)$acc['recovery_hash'])) {
        countFailedLogin($acc, $TA);
        usleep(300000);
        err('Invalid e-mail or recovery code', 401);
    }
    resetFailedLogin($acc, $TA);

    // Set the new password and rotate the recovery code (old one is dead).
    $newHash = password_hash($newPw, PASSWORD_BCRYPT);
    if ($newHash === false) err('Could not hash password', 500);
    $newRecovery = generateRecoveryCode();
    db()->prepare("UPDATE `$TA` SET `password_hash` = ?, `recovery_hash` = ? WHERE `id` = ?")
        ->execute([$newHash, hashRecoveryCode($newRecovery), $acc['id']]);

    json([
        'ok'            => true,
        'recovery_code' => formatRecoveryCode($newRecovery),
    ]);
}

/**
 * POST /auth/password — change the account password. Requires the current
 * password; failure counting/lockout works exactly like login.
 */
function authPassword(string $TP, string $TA): void {
    $d = body();
    requireFields($d, ['email', 'current_password', 'new_password']);
    $email = normalizeEmail($d['email']);
    $curPw = (string)$d['current_password'];
    $newPw = (string)$d['new_password'];
    assertPasswordPolicy($newPw);

    $acc = fetchAccount($email, $TA);
    if ($acc === null) {
        password_verify($curPw, AUTH_DUMMY_HASH);
        usleep(300000);
        err('Invalid e-mail or password', 401);
    }
    if (isLocked($acc)) {
        err('Too many failed attempts — try again later', 429);
    }
    if (!password_verify($curPw, (string)$acc['password_hash'])) {
        countFailedLogin($acc, $TA);
        usleep(300000);
        err('Invalid e-mail or password', 401);
    }
    resetFailedLogin($acc, $TA);

    $hash = password_hash($newPw, PASSWORD_BCRYPT);
    if ($hash === false) err('Could not hash password', 500);
    db()->prepare("UPDATE `$TA` SET `password_hash` = ? WHERE `id` = ?")
        ->execute([$hash, $acc['id']]);
    json(['ok' => true]);
}
