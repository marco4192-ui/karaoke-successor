<?php
/**
 * Karaoke Successor — Online Leaderboard API Configuration
 * Hash-based, copyright-safe. No song metadata stored.
 */

// ── Database ──────────────────────────────────────────────
define('DB_HOST', 'mysqle88c.netcup.net');
define('DB_NAME', 'k347227_karaoke_leaderboard');
define('DB_USER', 'k347227_MightyUser');
define('DB_PASS', 'MichtyUser9911');
define('DB_CHARSET', 'utf8mb4');
define('DB_PREFIX', 'ks_');

// ── API ───────────────────────────────────────────────────
define('API_SECRET', 'ks-api-s3cr3t-ch4ng3-m3-1n-pr0d');
define('RATE_LIMIT_PER_MINUTE', 60);
define('MAX_LEADERBOARD_ENTRIES', 500);

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

/** Validate song hash format (v1:hex, 8-64 hex chars) */
function isValidSongHash(string $h): bool {
    return (bool) preg_match('/^v[0-9]+:[a-f0-9]{8,64}$/i', $h);
}

/** Validate country code (ISO 3166-1 alpha-2) */
function isValidCountry(?string $c): bool {
    if ($c === null || $c === '') return true; // nullable
    return (bool) preg_match('/^[A-Z]{2}$/', $c);
}

// ── CORS ───────────────────────────────────────────────────
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Access-Control-Max-Age: 86400');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Rate Limiting (file-based, per IP) ─────────────────────
(function () {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = sys_get_temp_dir() . '/ks_rl_' . md5($ip);
    $now = time();
    $data = file_exists($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
    // Prune entries older than 60s
    $data = array_filter($data, fn($t) => $t > $now - 60);
    if (count($data) >= RATE_LIMIT_PER_MINUTE) err('Rate limit exceeded', 429);
    $data[] = $now;
    @file_put_contents($file, json_encode(array_values($data)));
})();

// ── Auth: POST/PUT require API key ────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PUT'])) {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($key !== API_SECRET) err('Unauthorized', 401);
}
