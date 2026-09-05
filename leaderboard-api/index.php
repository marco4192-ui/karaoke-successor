<?php
/**
 * Karaoke Successor — Online Leaderboard API v3
 * Copyright-safe: songs identified by SHA-256 fingerprint hash only.
 * Anti-cheat: score plausibility + integrity hash verification.
 * Ownership: every write to a profile requires its sync_code (8 chars,
 * generated at registration). The sync_code also unlocks the profile
 * sync backup and profile deletion.
 *
 * Endpoints:
 *   GET    /                          API info
 *   POST   /profiles                  Register / upsert profile (upsert requires sync_code)
 *   GET    /profiles/{uid}            Public profile data (no sync_code in response)
 *   PUT    /profiles/{uid}            Update settings (requires sync_code)
 *   DELETE /profiles/{uid}            Delete profile + scores (requires sync_code)
 *   PUT    /profiles/{uid}/sync       Store profile sync snapshot (requires sync_code)
 *   GET    /profiles/sync/{code}      Retrieve sync snapshot by code
 *   POST   /scores                    Submit score (requires profile sync_code)
 *   GET    /scores/batch?hashes=..    Batch-fetch leaderboards for multiple song hashes
 *   GET    /leaderboard/song/{hash}   Per-song leaderboard (Top N)
 *   GET    /leaderboard/global        Global player ranking
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

try {
    match ($parts[0] ?? '') {
        '', 'info'    => json(['name' => 'Karaoke Leaderboard', 'version' => '3.0.0', 'copyright_safe' => true, 'anti_cheat' => true]),
        'profiles'    => routeProfiles($parts, $method, $T_PROFILES, $T_SCORES),
        'scores'      => routeScores($parts, $method, $T_PROFILES, $T_SCORES),
        'leaderboard' => routeLeaderboard($parts, $method, $T_PROFILES, $T_SCORES),
        default       => err('Not found', 404),
    };
} catch (PDOException $e) {
    err('Database error', 500);
} catch (Throwable $e) {
    err('Internal error', 500);
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

    // PUT /profiles/{uid} — update settings (requires sync_code)
    // All fields are sent; the statement is fully static, request data is
    // bound through placeholders only.
    if ($method === 'PUT' && $uid && !$sub) {
        $d = body();
        requireOwnership($uid, $d, $TP);
        requireFields($d, ['display_name', 'color', 'show_on_board', 'show_country']);
        $name = clean((string)$d['display_name']);
        if (mb_strlen($name) < 1 || mb_strlen($name) > 64) err('display_name: 1-64 chars');
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

/** Validate the sync_code format (8 chars A-Z0-9). */
function isValidSyncCode(string $c): bool {
    return (bool) preg_match('/^[A-Z0-9]{8}$/', $c);
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

/** Generate a random, unused 8-char sync code. */
function generateSyncCode(string $TP): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for ($try = 0; $try < 20; $try++) {
        $code = '';
        for ($i = 0; $i < 8; $i++) {
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
        $s = db()->prepare("SELECT `profile_uid`,`display_name`,`color`,`country_code`,`show_on_board`,`show_country`,`total_score`,`best_score`,`songs_played`,`games_played`,`avg_accuracy`,`created_at`,`updated_at` FROM `$TP` WHERE `profile_uid` = ?");
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
function routeScores(array $parts, string $method, string $TP, string $TS): void {
    if ($method === 'POST' && !isset($parts[1])) { submitScore($TP, $TS); return; }
    if ($method === 'GET'  && ($parts[1] ?? '') === 'batch') { batchScores($TP, $TS); return; }
    err('Not found', 404);
}

function submitScore(string $TP, string $TS): void {
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
    $flagsJson = !empty($acFlags) ? json_encode($acFlags, JSON_UNESCAPED_UNICODE) : null;

    // Determine fingerprint version
    $fpVersion = ($v2Hash !== null) ? 'v2' : 'v1';

    // New personal best = no existing row yet, or submitted score beats it.
    // Must be read BEFORE the upsert overwrites the row.
    $cur = db()->prepare("SELECT `score` FROM `$TS` WHERE `profile_uid` = ? AND `song_hash` = ? AND `game_type` = ?");
    $cur->execute([$uid, $hash, $gt]);
    $existingScore = $cur->fetchColumn();
    $isNewBest = ($existingScore === false) || ($score > (int)$existingScore);

    // UPSERT: keep higher score
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
            `played_at`    = CURRENT_TIMESTAMP,
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

    // Calculate rank
    $rank = songRank($TS, $TP, $hash, $gt, $score);

    $response = ['ok'=>true, 'rank'=>$rank, 'is_new_best'=>$isNewBest, 'verified'=>$verified];
    if ($acReason) $response['verification_note'] = $acReason;
    if (!empty($acFlags)) $response['flags'] = $acFlags;
    json($response);
}

function batchScores(string $TP, string $TS): void {
    $raw = $_GET['hashes'] ?? '';
    if (!$raw) err('Missing hashes parameter');
    $hashes = array_slice(array_unique(explode(',', $raw)), 0, 200);
    foreach ($hashes as $h) { if (!isValidSongHash($h)) err('Invalid hash: '.$h); }

    $gt    = in_array($_GET['game_type'] ?? 's', ['s','d']) ? $_GET['game_type'] : 's';
    $limit = min((int)($_GET['limit'] ?? 5000), 10000);

    $ph = implode(',', array_fill(0, count($hashes), '?'));
    $sql = "SELECT
        s.`song_hash`, s.`profile_uid`, s.`score`, s.`max_score`, s.`accuracy`,
        s.`max_combo`, s.`difficulty`, s.`rating`, s.`played_at`,
        s.`verified`, s.`fingerprint_version`,
        p.`display_name`, p.`color`,
        IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
        FROM `$TS` s JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE s.`song_hash` IN ($ph) AND s.`game_type` = ? AND p.`show_on_board` = 1
        ORDER BY s.`score` DESC
        LIMIT $limit";
    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge($hashes, [$gt]));
    $rows = $stmt->fetchAll();

    $result = []; $ranks = [];
    foreach ($rows as $row) {
        $h = $row['song_hash'];
        if (!isset($ranks[$h])) $ranks[$h] = 1;
        $row['rank'] = $ranks[$h]++;
        $result[$h][] = $row;
    }
    json(['scores' => $result]);
}

// ============================================================
// LEADERBOARD
// ============================================================
function routeLeaderboard(array $parts, string $method, string $TP, string $TS): void {
    if ($method !== 'GET') err('Method not allowed', 405);
    $type = $parts[1] ?? '';
    if ($type === 'global') { globalBoard($TP); return; }
    if ($type === 'song' && isset($parts[2])) { songBoard($parts[2], $TP, $TS); return; }
    err('Unknown leaderboard type', 404);
}

function globalBoard(string $TP): void {
    $limit  = min((int)($_GET['limit'] ?? 100), MAX_LEADERBOARD_ENTRIES);
    $offset = (int)($_GET['offset'] ?? 0);
    $sql = "SELECT
        `profile_uid`,`display_name`,`color`,
        IF(`show_country`=1,`country_code`,NULL) AS `country_code`,
        `total_score`,`best_score`,`songs_played`,`games_played`,`avg_accuracy`
        FROM `$TP`
        WHERE `show_on_board` = 1
        ORDER BY `total_score` DESC
        LIMIT ? OFFSET ?";
    $stmt = db()->prepare($sql); $stmt->execute([$limit, $offset]);
    $rows = $stmt->fetchAll();
    $r = $offset + 1;
    foreach ($rows as &$row) { $row['rank'] = $r++; }
    json(['leaderboard' => $rows]);
}

function songBoard(string $hash, string $TP, string $TS): void {
    $hash = clean($hash);
    if (!isValidSongHash($hash)) err('Invalid song_hash');
    $gt    = in_array($_GET['game_type'] ?? 's', ['s','d']) ? $_GET['game_type'] : 's';
    $limit = min((int)($_GET['limit'] ?? 100), MAX_LEADERBOARD_ENTRIES);
    $sql = "SELECT
        s.`profile_uid`, s.`score`, s.`max_score`, s.`accuracy`,
        s.`max_combo`, s.`difficulty`, s.`rating`, s.`played_at`,
        s.`verified`, s.`fingerprint_version`,
        p.`display_name`, p.`color`,
        IF(p.`show_country`=1, p.`country_code`, NULL) AS `country_code`
        FROM `$TS` s JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE s.`song_hash` = ? AND s.`game_type` = ? AND p.`show_on_board` = 1
        ORDER BY s.`score` DESC
        LIMIT ?";
    $stmt = db()->prepare($sql); $stmt->execute([$hash, $gt, $limit]);
    $rows = $stmt->fetchAll();
    $r = 1;
    foreach ($rows as &$row) { $row['rank'] = $r++; }
    json(['song_hash' => $hash, 'game_type' => $gt, 'leaderboard' => $rows]);
}

// ============================================================
// HELPERS
// ============================================================
function songRank(string $TS, string $TP, string $hash, string $gt, int $score): int {
    $sql = "SELECT COUNT(*)+1 FROM `$TS` s
        JOIN `$TP` p ON s.`profile_uid` = p.`profile_uid`
        WHERE s.`song_hash` = ? AND s.`game_type` = ? AND p.`show_on_board` = 1 AND s.`score` > ?";
    $stmt = db()->prepare($sql);
    $stmt->execute([$hash, $gt, $score]);
    return (int)$stmt->fetchColumn();
}
