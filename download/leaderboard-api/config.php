<?php
/**
 * Karaoke Leaderboard API Configuration
 * 
 * For shared hosting (netcup.com) with MySQL database
 */

// Database Configuration
define('DB_HOST', 'localhost');           // Usually localhost on shared hosting
define('DB_NAME', 'your_database_name');  // Your MySQL database name
define('DB_USER', 'your_db_user');        // Your MySQL username
define('DB_PASS', 'your_db_password');    // Your MySQL password
define('DB_CHARSET', 'utf8mb4');

// Table Prefix - Useful for multiple apps in one database
// Change this to something unique like 'karaoke_' or 'ks_'
define('DB_PREFIX', 'ks_');

// API Configuration
define('API_SECRET', 'change-this-to-a-secure-random-string');  // For API authentication
define('RATE_LIMIT_PER_MINUTE', 60);   // Max requests per IP per minute
define('CACHE_DURATION', 300);         // Cache duration in seconds (5 minutes)

// CORS Settings - Update with your actual domain
define('ALLOWED_ORIGINS', json_encode([
    'http://localhost:3000',
    'https://your-domain.com',
    // Add your actual domain here
]));

// Error Reporting (disable in production)
if (getenv('APP_ENV') === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

/**
 * Get database connection
 */
function getDB(): PDO {
    static $pdo = null;
    
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            sendError('Database connection failed', 500);
        }
    }
    
    return $pdo;
}

/**
 * Get table name with prefix
 */
function table(string $name): string {
    return DB_PREFIX . $name;
}

/**
 * Send JSON response
 */
function sendJSON(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send error response
 */
function sendError(string $message, int $status = 400, array $details = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => true,
        'message' => $message,
        'details' => $details
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Validate API key (optional authentication)
 */
function validateAPIKey(): bool {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? null;
    
    // Skip auth for read-only endpoints if desired
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['REQUEST_URI'];
    
    // Allow GET requests without API key
    if ($method === 'GET') {
        return true;
    }
    
    // Require API key for POST/PUT/DELETE
    if (!$apiKey || $apiKey !== API_SECRET) {
        sendError('Unauthorized - Invalid API key', 401);
    }
    
    return true;
}

/**
 * Simple rate limiting using file-based storage
 * For production, consider using Redis or database-based rate limiting
 */
function checkRateLimit(): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $cacheFile = sys_get_temp_dir() . '/rate_limit_' . md5($ip);
    
    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        $minute = date('Y-m-d H:i');
        
        if (isset($data[$minute])) {
            if ($data[$minute] >= RATE_LIMIT_PER_MINUTE) {
                sendError('Rate limit exceeded', 429);
            }
            $data[$minute]++;
        } else {
            // Clean old entries and start new minute
            $data = [$minute => 1];
        }
    } else {
        $data = [date('Y-m-d H:i') => 1];
    }
    
    file_put_contents($cacheFile, json_encode($data));
}

/**
 * Handle CORS preflight and headers
 */
function handleCORS(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    $allowedOrigins = json_decode(ALLOWED_ORIGINS, true);
    
    if (in_array($origin, $allowedOrigins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
    header('Access-Control-Max-Age: 86400');
    
    // Handle preflight request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Get JSON input from request body
 */
function getJSONInput(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON input', 400);
    }
    
    return $data ?? [];
}

/**
 * Generate unique player ID
 */
function generatePlayerId(): string {
    return 'player_' . bin2hex(random_bytes(16));
}

/**
 * Sanitize string for database
 */
function sanitize(string $input): string {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
function isValidCountryCode(string $code): bool {
    $validCodes = [
        'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
        'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
        'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE',
        'DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR',
        'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
        'HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP',
        'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
        'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
        'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA',
        'RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
        'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'
    ];
    return in_array(strtoupper($code), $validCodes);
}

// Initialize CORS handling
handleCORS();

// Check rate limit for all requests
checkRateLimit();
