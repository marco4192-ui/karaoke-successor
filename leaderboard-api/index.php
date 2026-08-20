<?php
/**
 * Karaoke Successor — Online Leaderboard API v2
 * Copyright-safe: songs identified by SHA-256 fingerprint hash only.
 *
 * Endpoints:
 *   GET  /                        API info
 *   POST /profiles                Register / upsert profile
 *   PUT  /profiles/{uid}          Update privacy & display settings
 *   POST /scores                  Submit score (upsert: higher score wins)
 *   GET  /scores/batch?hashes=..  Batch-fetch leaderboards for multiple song hashes
 *   GET  /leaderboard/song/{hash} Per-song leaderboard (Top N)
 *   GET  /leaderboard/global      Global player ranking
 */

require_once __DIR__ . '/config.php';

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
        '', 'info'    => json(['name' => 'Karaoke Leaderboard', 'version' => '2.0.0', 'copyright_safe' => true]),
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

    // POST /profiles — register or upsert
    if ($method === 'POST' && !$uid) {
        $d = body();
        requireFields($d, ['profile_uid', 'display_name']);
        $uid  = clean($d['profile_uid']);
        $name = clean($d['display_name']);
        if (!isValidUUID($uid)) err('Invalid profile_uid');
        if (mb_strlen($name) < 1 || mb_strlen($name) > 64) err('display_name: 1-64 chars');
        $color = preg_match('/^#[0-9a-f]{6}$/i', $d['color'] ?? '') ? $d['color'] : '#8B5CF6';
        $cc    = $d['country_code'] ?? null;
        if ($cc !== null && !isValidCountry($cc)) err('Invalid country_code');

        $sql = "INSERT INTO `$TP` (`profile_uid`,`display_name`,`color`,`country_code`)
               VALUES (?,?,?,?)
               ON DUPLICATE KEY UPDATE
                   `display_name` = VALUES(`display_name`),
                   `color`        = VALUES(`color`),
                   `country_code` = VALUES(`country_code`)";
        db()->prepare($sql)->execute([$uid, $name, $color, $cc]);
        fetchProfile($uid, $TP); return;
    }

    // PUT /profiles/{uid} — update settings
    if ($method === 'PUT' && $uid) {
        $d = body();
        $sets = []; $vals = [];
        $map = ['display_name'=>'s','color'=>'s','country_code'=>'s','show_on_board'=>'i','show_country'=>'i'];
        foreach ($map as $k => $t) {
            if (!array_key_exists($k, $d)) continue;
            $sets[] = "`$k` = ?";
            $vals[] = $t === 'i' ? (int)$d[$k] : clean((string)$d[$k]);
        }
        if (!$sets) err('No valid fields');
        $vals[] = $uid;
        db()->prepare("UPDATE `$TP` SET " . implode(', ', $sets) . " WHERE `profile_uid` = ?")->execute($vals);
        fetchProfile($uid, $TP); return;
    }

    // GET /profiles/{uid}
    if ($method === 'GET' && $uid) { fetchProfile($uid, $TP); return; }

    err('Not found', 404);
}

function fetchProfile(string $uid, string $TP): void {
    $s = db()->prepare("SELECT * FROM `$TP` WHERE `profile_uid` = ?");
    $s->execute([$uid]);
    $p = $s->fetch() ?: null;
    if (!$p) err('Profile not found', 404);
    json($p);
}

// ============================================================
// SCORES
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
    $gt    = $d['game_type'];
    $score = (int)$d['score'];
    $maxSc = (int)$d['max_score'];

    if (!isValidUUID($uid))      err('Invalid profile_uid');
    if (!isValidSongHash($hash))  err('Invalid song_hash (v1:hex)');
    if (!in_array($gt, ['s','d'])) err('game_type: s or d');
    if ($score < 0 || $maxSc < 1) err('Invalid score');

    // Profile must exist & opted in
    $p = db()->prepare("SELECT `show_on_board` FROM `$TP` WHERE `profile_uid` = ?");
    $p->execute([$uid]);
    $prof = $p->fetch();
    if (!$prof) err('Profile not found — register first', 404);
    if (!(int)$prof['show_on_board']) err('Profile opted out');

    $acc  = min(100, max(0, (float)($d['accuracy'] ?? 0)));
    $combo= (int)($d['max_combo'] ?? 0);
    $diff = in_array($d['difficulty'] ?? '', ['easy','normal','hard']) ? $d['difficulty'] : 'normal';
    $rat  = in_array($d['rating'] ?? '', ['perfect','excellent','good','okay','poor']) ? $d['rating'] : 'good';
    $hit  = (int)($d['notes_hit'] ?? 0);
    $miss = (int)($d['notes_missed'] ?? 0);

    // UPSERT: keep higher score
    $sql = "INSERT INTO `$TS`
        (`profile_uid`,`song_hash`,`game_type`,`score`,`max_score`,`accuracy`,`max_combo`,`difficulty`,`rating`,`notes_hit`,`notes_missed`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            `score`        = IF(VALUES(`score`) > `score`, VALUES(`score`), `score`),
            `max_score`    = IF(VALUES(`score`) > `score`, VALUES(`max_score`), `max_score`),
            `accuracy`     = IF(VALUES(`score`) > `score`, VALUES(`accuracy`), `accuracy`),
            `max_combo`    = IF(VALUES(`score`) > `score`, VALUES(`max_combo`), `max_combo`),
            `difficulty`   = IF(VALUES(`score`) > `score`, VALUES(`difficulty`), `difficulty`),
            `rating`       = IF(VALUES(`score`) > `score`, VALUES(`rating`), `rating`),
            `notes_hit`    = IF(VALUES(`score`) > `score`, VALUES(`notes_hit`), `notes_hit`),
            `notes_missed` = IF(VALUES(`score`) > `score`, VALUES(`notes_missed`), `notes_missed`),
            `played_at`    = CURRENT_TIMESTAMP";
    db()->prepare($sql)->execute([$uid,$hash,$gt,$score,$maxSc,$acc,$combo,$diff,$rat,$hit,$miss]);

    db()->prepare("CALL sp_refresh_profile_stats(?)")->execute([$uid]);

    // Calculate rank
    $rank = songRank($TS, $TP, $hash, $gt, $score);
    json(['ok'=>true, 'rank'=>$rank, 'is_new_best'=>true]);
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
