<?php
/**
 * Karaoke Successor — Online Leaderboard API Configuration
 * Hash-based, copyright-safe. No song metadata stored.
 *
 * CREDENTIALS LIVE OUTSIDE THIS FILE — it is committed to a public repo.
 * Provide them either via environment variables (preferred) or by uploading
 * a `config.local.php` next to this file (gitignored, never commit it):
 *
 *   <?php
 *   define('DB_PASS', '...');
 *   define('API_SECRET', '...');
 *
 * Environment variables override config.local.php.
 */

// ── Database ──────────────────────────────────────────────
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
$env = static function (string $key, string $fallback = ''): string {
    $v = getenv($key);
    return ($v === false || $v === '') ? $fallback : $v;
};
define('DB_HOST', $env('KS_DB_HOST'));
define('DB_NAME', $env('KS_DB_NAME'));
define('DB_USER', $env('KS_DB_USER'));
define('DB_PASS', $env('KS_DB_PASS'));
define('DB_CHARSET', 'utf8mb4');
define('DB_PREFIX', 'ks_');

// ── API ───────────────────────────────────────────────────
define('API_SECRET', $env('KS_API_SECRET'));
define('RATE_LIMIT_PER_MINUTE', 60);
define('MAX_LEADERBOARD_ENTRIES', 500);

// Fail fast with a clear message instead of a fatal PDO error later.
if (DB_HOST === '' || DB_NAME === '' || DB_USER === '') {
    err('Server misconfiguration: database credentials missing (set KS_DB_* env vars or upload config.local.php).', 500);
}
if (API_SECRET === '') {
    err('Server misconfiguration: KS_API_SECRET not set.', 500);
}

// ── CORS (allow all origins — app-only, no web access) ────
define('ALLOWED_ORIGINS', '*');

// ── Error Reporting ───────────────────────────────────────
error_reporting(0);
ini_set('display_errors', '0');

// ============================================================
// Helper Functions
// ============================================================

/** Get PDO singleton */
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/** Table name with prefix */
function tbl(string $name): string {
    return DB_PREFIX . $name;
}

/** Send JSON response and exit */
function json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Send error and exit */
function err(string $msg, int $status = 400): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => true, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Read JSON body */
function body(): array {
    $raw = file_get_contents('php://input');
    // R69: hard size cap — the sync upload enforces its own 1 MB snapshot
    // limit on top of this; everything larger than 1.5 MB is garbage or an
    // attack and is rejected before json_decode allocates it.
    if (strlen($raw) > 1572864) err('Payload too large (max 1.5 MB)', 413);
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) err('Invalid JSON');
    return $data ?? [];
}

/** Validate required fields */
function requireFields(array $data, array $fields): void {
    foreach ($fields as $f) {
        if (!isset($data[$f]) || $data[$f] === '' || $data[$f] === null) {
            err("Missing required field: $f");
        }
    }
}

/** Sanitize string (trim, strip tags) */
function clean(string $s): string {
    return trim(strip_tags($s));
}

/** Validate UUID v4 format */
function isValidUUID(string $uid): bool {
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uid);
}

/**
 * Validate song hash format (v1:hex, 8-64 hex chars).
 *
 * R67: the client's sync SHA-256 implementation stringifies negative result
 * words as "-30f7239b" (signed int32) — ~75 % of all song hash prefixes
 * therefore contain one or two '-' characters. The format is deterministic,
 * collision-free and already stored in the DB by deployed app versions, so
 * it is accepted as-is; changing the client format would split the per-song
 * boards between old and new app builds.
 */
function isValidSongHash(string $h): bool {
    return (bool) preg_match('/^v[0-9]+:[-a-f0-9]{8,64}$/i', $h);
}

/** Validate country code (ISO 3166-1 alpha-2) */
function isValidCountry(?string $c): bool {
    if ($c === null || $c === '') return true; // nullable
    return (bool) preg_match('/^[A-Z]{2}$/', $c);
}

// ── CORS ───────────────────────────────────────────────────
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Access-Control-Max-Age: 86400');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Rate Limiting (file-based, per IP) ─────────────────────
// R69: flock(LOCK_EX) around the read-modify-write — concurrent requests
// used to race on the counter file (two parallel requests both read the
// same count, both passed the limit).
(function () {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = sys_get_temp_dir() . '/ks_rl_' . md5($ip);
    $now = time();
    $fh = @fopen($file, 'c+');
    if ($fh === false) return; // never hard-fail on limiter I/O issues
    try {
        if (!flock($fh, LOCK_EX)) return;
        $raw = stream_get_contents($fh);
        $data = $raw === false ? [] : (json_decode($raw, true) ?: []);
        // Prune entries older than 60s
        $data = array_filter($data, fn($t) => $t > $now - 60);
        if (count($data) >= RATE_LIMIT_PER_MINUTE) {
            flock($fh, LOCK_UN);
            err('Rate limit exceeded', 429);
        }
        $data[] = $now;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode(array_values($data)));
        fflush($fh);
        flock($fh, LOCK_UN);
    } finally {
        fclose($fh);
    }
})();

// ── Auth: EVERY method except CORS preflight requires the API key ──
// R69: previously only POST/PUT were keyed — DELETE /profiles/{uid} and
// all GET endpoints (including the sync-snapshot download by code) were
// reachable without it. The client has always sent the header on every
// request, so this is a purely server-side hardening. OPTIONS preflights
// must stay open (they never carry custom headers by spec).
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'OPTIONS') {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($key !== API_SECRET) err('Unauthorized', 401);
}
