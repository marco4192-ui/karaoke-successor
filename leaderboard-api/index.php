<?php
/**
 * Karaoke Leaderboard API - Main Entry Point
 * 
 * Routes:
 *   GET  /                    - API info
 *   GET  /scores              - Get all scores (with pagination)
 *   GET  /scores/{id}         - Get specific score
 *   POST /scores              - Submit new score
 *   GET  /players             - Get all players
 *   GET  /players/{id}        - Get player details
 *   POST /players             - Create/update player
 *   PUT  /players/{id}        - Update player settings
 *   GET  /leaderboard/global  - Global leaderboard
 *   GET  /leaderboard/song/{id} - Song-specific leaderboard
 *   GET  /leaderboard/recent  - Recent scores
 *   GET  /songs               - Get all songs
 *   GET  /songs/{id}          - Get song details
 *   GET  /search              - Search songs/players
 */

require_once __DIR__ . '/config.php';

// Rate limiting check
if (!checkRateLimit()) {
    sendError('Rate limit exceeded. Please try again later.', 429);
}

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace('/index.php', '', $path);
$path = rtrim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Remove API prefix if present
$path = preg_replace('#^/leaderboard-api#', '', $path);

// Get request body for POST/PUT
$requestBody = null;
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $requestBody = json_decode(file_get_contents('php://input'), true);
}

// Route the request
try {
    $db = Database::getInstance()->getConnection();
    $router = new Router($db, $method, $path, $requestBody);
    $router->handle();
} catch (Exception $e) {
    sendError('Internal server error: ' . $e->getMessage(), 500);
}

/**
 * Simple Router Class
 */
class Router {
    private $db;
    private $method;
    private $path;
    private $body;
    private $segments;
    
    public function __construct($db, $method, $path, $body) {
        $this->db = $db;
        $this->method = $method;
        $this->path = $path ?: '/';
        $this->body = $body ?? [];
        $this->segments = array_filter(explode('/', $this->path));
    }
    
    public function handle() {
        $firstSegment = $this->segments[1] ?? '';
        
        switch ($firstSegment) {
            case '':
            case 'info':
                $this->apiInfo();
                break;
                
            case 'players':
                $this->handlePlayers();
                break;
                
            case 'scores':
                $this->handleScores();
                break;
                
            case 'leaderboard':
                $this->handleLeaderboard();
                break;
                
            case 'songs':
                $this->handleSongs();
                break;
                
            case 'search':
                $this->handleSearch();
                break;
                
            default:
                sendError('Endpoint not found', 404);
        }
    }
    
    // ==========================================
    // API Info
    // ==========================================
    private function apiInfo() {
        sendJsonResponse([
            'name' => 'Karaoke Leaderboard API',
            'version' => '1.0.0',
            'endpoints' => [
                'GET /players' => 'List all players',
                'GET /players/{id}' => 'Get player details',
                'POST /players' => 'Create/update player',
                'PUT /players/{id}' => 'Update player settings',
                'GET /scores' => 'List scores',
                'POST /scores' => 'Submit score',
                'GET /leaderboard/global' => 'Global leaderboard',
                'GET /leaderboard/song/{id}' => 'Song leaderboard',
                'GET /leaderboard/recent' => 'Recent scores',
                'GET /songs' => 'List songs',
                'GET /search?q=query' => 'Search',
            ]
        ]);
    }
    
    // ==========================================
    // Players Endpoints
    // ==========================================
    private function handlePlayers() {
        $id = $this->segments[2] ?? null;
        
        switch ($this->method) {
            case 'GET':
                if ($id) {
                    $this->getPlayer($id);
                } else {
                    $this->listPlayers();
                }
                break;
                
            case 'POST':
                $this->createOrUpdatePlayer();
                break;
                
            case 'PUT':
                if ($id) {
                    $this->updatePlayerSettings($id);
                } else {
                    sendError('Player ID required', 400);
                }
                break;
                
            default:
                sendError('Method not allowed', 405);
        }
    }
    
    private function listPlayers() {
        $limit = min((int)($_GET['limit'] ?? 50), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        
        $stmt = $this->db->prepare("
            SELECT id, name, country, color, show_on_leaderboard,
                   total_score, games_played, avg_accuracy, best_score
            FROM " . DB_PREFIX . "players
            ORDER BY total_score DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        $players = $stmt->fetchAll();
        
        sendJsonResponse(['players' => $players]);
    }
    
    private function getPlayer($id) {
        $stmt = $this->db->prepare("
            SELECT * FROM " . DB_PREFIX . "players WHERE id = ?
        ");
        $stmt->execute([$id]);
        $player = $stmt->fetch();
        
        if (!$player) {
            sendError('Player not found', 404);
        }
        
        // Get player's top songs
        $stmt = $this->db->prepare("
            SELECT s.song_id, s.score, s.accuracy, s.difficulty, s.played_at,
                   songs.title, songs.artist
            FROM " . DB_PREFIX . "scores s
            JOIN " . DB_PREFIX . "songs songs ON s.song_id = songs.id
            WHERE s.player_id = ?
            ORDER BY s.score DESC
            LIMIT 10
        ");
        $stmt->execute([$id]);
        $player['top_songs'] = $stmt->fetchAll();
        
        // Get achievements
        $stmt = $this->db->prepare("
            SELECT achievement_id, unlocked_at 
            FROM " . DB_PREFIX . "achievements 
            WHERE player_id = ?
        ");
        $stmt->execute([$id]);
        $player['achievements'] = $stmt->fetchAll();
        
        sendJsonResponse($player);
    }
    
    private function createOrUpdatePlayer() {
        $data = $this->body;
        
        if (!validateInput($data, ['id', 'name'])) {
            sendError('Missing required fields: id, name', 400);
        }
        
        $id = sanitizeString($data['id']);
        $name = sanitizeString($data['name']);
        $country = sanitizeString($data['country'] ?? 'DE');
        $color = sanitizeString($data['color'] ?? '#8B5CF6');
        $avatarUrl = isset($data['avatar_url']) ? sanitizeString($data['avatar_url']) : null;
        
        $stmt = $this->db->prepare("
            INSERT INTO " . DB_PREFIX . "players (id, name, country, color, avatar_url)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                country = VALUES(country),
                color = VALUES(color),
                avatar_url = VALUES(avatar_url),
                updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$id, $name, $country, $color, $avatarUrl]);
        
        $this->getPlayer($id);
    }
    
    private function updatePlayerSettings($id) {
        $data = $this->body;
        
        $fields = [];
        $values = [];
        
        $allowedFields = [
            'show_on_leaderboard' => 'show_on_leaderboard',
            'show_photo' => 'show_photo',
            'show_country' => 'show_country',
            'name' => 'name',
            'country' => 'country',
            'color' => 'color',
        ];
        
        foreach ($allowedFields as $inputKey => $dbField) {
            if (isset($data[$inputKey])) {
                $fields[] = "$dbField = ?";
                $values[] = $inputKey === 'name' ? sanitizeString($data[$inputKey]) : (int)$data[$inputKey];
            }
        }
        
        if (empty($fields)) {
            sendError('No valid fields to update', 400);
        }
        
        $values[] = $id;
        
        $stmt = $this->db->prepare("
            UPDATE " . DB_PREFIX . "players 
            SET " . implode(', ', $fields) . ", updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute($values);
        
        $this->getPlayer($id);
    }
    
    // ==========================================
    // Scores Endpoints
    // ==========================================
    private function handleScores() {
        $id = $this->segments[2] ?? null;
        
        switch ($this->method) {
            case 'GET':
                if ($id) {
                    $this->getScore($id);
                } else {
                    $this->listScores();
                }
                break;
                
            case 'POST':
                $this->submitScore();
                break;
                
            default:
                sendError('Method not allowed', 405);
        }
    }
    
    private function listScores() {
        $limit = min((int)($_GET['limit'] ?? 50), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        $playerId = $_GET['player_id'] ?? null;
        $songId = $_GET['song_id'] ?? null;
        
        $where = [];
        $params = [];
        
        if ($playerId) {
            $where[] = 's.player_id = ?';
            $params[] = $playerId;
        }
        if ($songId) {
            $where[] = 's.song_id = ?';
            $params[] = $songId;
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $this->db->prepare("
            SELECT s.*, p.name as player_name, p.country, p.color,
                   songs.title, songs.artist
            FROM " . DB_PREFIX . "scores s
            JOIN " . DB_PREFIX . "players p ON s.player_id = p.id
            JOIN " . DB_PREFIX . "songs songs ON s.song_id = songs.id
            $whereClause
            ORDER BY s.score DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute($params);
        $scores = $stmt->fetchAll();
        
        sendJsonResponse(['scores' => $scores]);
    }
    
    private function getScore($id) {
        $stmt = $this->db->prepare("
            SELECT s.*, p.name as player_name, p.country, p.color,
                   songs.title, songs.artist
            FROM " . DB_PREFIX . "scores s
            JOIN " . DB_PREFIX . "players p ON s.player_id = p.id
            JOIN " . DB_PREFIX . "songs songs ON s.song_id = songs.id
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $score = $stmt->fetch();
        
        if (!$score) {
            sendError('Score not found', 404);
        }
        
        sendJsonResponse($score);
    }
    
    private function submitScore() {
        $data = $this->body;
        
        if (!validateInput($data, ['player_id', 'song_id', 'score'])) {
            sendError('Missing required fields: player_id, song_id, score', 400);
        }
        
        // Start transaction
        $this->db->beginTransaction();
        
        try {
            // Ensure song exists
            $stmt = $this->db->prepare("
                INSERT IGNORE INTO " . DB_PREFIX . "songs (id, title, artist, duration)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitizeString($data['song_id']),
                sanitizeString($data['song_title'] ?? 'Unknown'),
                sanitizeString($data['song_artist'] ?? 'Unknown'),
                (int)($data['duration'] ?? 0)
            ]);
            
            // Insert score
            $id = generateId();
            $stmt = $this->db->prepare("
                INSERT INTO " . DB_PREFIX . "scores (
                    id, player_id, song_id, score, accuracy, max_combo,
                    difficulty, game_mode, rating, notes_hit, notes_missed,
                    duration_played, is_duet, harmony_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id,
                sanitizeString($data['player_id']),
                sanitizeString($data['song_id']),
                (int)$data['score'],
                (float)($data['accuracy'] ?? 0),
                (int)($data['max_combo'] ?? 0),
                sanitizeString($data['difficulty'] ?? 'medium'),
                sanitizeString($data['game_mode'] ?? 'standard'),
                sanitizeString($data['rating'] ?? 'good'),
                (int)($data['notes_hit'] ?? 0),
                (int)($data['notes_missed'] ?? 0),
                (int)($data['duration_played'] ?? 0),
                (int)($data['is_duet'] ?? 0),
                isset($data['harmony_score']) ? (int)$data['harmony_score'] : null
            ]);
            
            // Update player stats
            $this->db->prepare("CALL sp_update_player_stats(?)")
                     ->execute([sanitizeString($data['player_id'])]);
            
            $this->db->commit();
            
            $this->getScore($id);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            sendError('Failed to submit score: ' . $e->getMessage(), 500);
        }
    }
    
    // ==========================================
    // Leaderboard Endpoints
    // ==========================================
    private function handleLeaderboard() {
        $type = $this->segments[2] ?? 'global';
        
        switch ($type) {
            case 'global':
                $this->getGlobalLeaderboard();
                break;
                
            case 'song':
                $songId = $this->segments[3] ?? null;
                if (!$songId) {
                    sendError('Song ID required', 400);
                }
                $this->getSongLeaderboard($songId);
                break;
                
            case 'recent':
                $this->getRecentScores();
                break;
                
            default:
                sendError('Unknown leaderboard type', 404);
        }
    }
    
    private function getGlobalLeaderboard() {
        $limit = min((int)($_GET['limit'] ?? 100), MAX_LEADERBOARD_ENTRIES);
        $offset = (int)($_GET['offset'] ?? 0);
        
        $stmt = $this->db->prepare("
            SELECT 
                id, name, 
                CASE WHEN show_photo = 1 THEN avatar_url ELSE NULL END as avatar_url,
                CASE WHEN show_country = 1 THEN country ELSE NULL END as country,
                color, total_score, games_played, avg_accuracy, best_score
            FROM " . DB_PREFIX . "players
            WHERE show_on_leaderboard = 1
            ORDER BY total_score DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        $players = $stmt->fetchAll();
        
        // Add rank
        $rank = $offset + 1;
        foreach ($players as &$player) {
            $player['rank'] = $rank++;
        }
        
        sendJsonResponse(['leaderboard' => $players]);
    }
    
    private function getSongLeaderboard($songId) {
        $limit = min((int)($_GET['limit'] ?? 50), MAX_LEADERBOARD_ENTRIES);
        
        $stmt = $this->db->prepare("
            SELECT 
                s.id as score_id,
                s.player_id,
                p.name,
                CASE WHEN p.show_photo = 1 THEN p.avatar_url ELSE NULL END as avatar_url,
                CASE WHEN p.show_country = 1 THEN p.country ELSE NULL END as country,
                p.color,
                s.score,
                s.accuracy,
                s.max_combo,
                s.difficulty,
                s.played_at,
                s.rating
            FROM " . DB_PREFIX . "scores s
            JOIN " . DB_PREFIX . "players p ON s.player_id = p.id
            WHERE s.song_id = ? AND p.show_on_leaderboard = 1
            ORDER BY s.score DESC
            LIMIT ?
        ");
        $stmt->execute([$songId, $limit]);
        $scores = $stmt->fetchAll();
        
        // Add rank
        $rank = 1;
        foreach ($scores as &$score) {
            $score['rank'] = $rank++;
        }
        
        // Get song info
        $stmt = $this->db->prepare("
            SELECT id, title, artist, duration 
            FROM " . DB_PREFIX . "songs WHERE id = ?
        ");
        $stmt->execute([$songId]);
        $song = $stmt->fetch();
        
        sendJsonResponse([
            'song' => $song,
            'leaderboard' => $scores
        ]);
    }
    
    private function getRecentScores() {
        $limit = min((int)($_GET['limit'] ?? 50), 100);
        
        $stmt = $this->db->prepare("
            SELECT 
                s.id,
                s.player_id,
                p.name as player_name,
                CASE WHEN p.show_photo = 1 THEN p.avatar_url ELSE NULL END as avatar_url,
                CASE WHEN p.show_country = 1 THEN p.country ELSE NULL END as country,
                p.color,
                s.song_id,
                songs.title as song_title,
                songs.artist as song_artist,
                s.score,
                s.accuracy,
                s.difficulty,
                s.played_at,
                s.rating
            FROM " . DB_PREFIX . "scores s
            JOIN " . DB_PREFIX . "players p ON s.player_id = p.id
            JOIN " . DB_PREFIX . "songs songs ON s.song_id = songs.id
            WHERE p.show_on_leaderboard = 1
            ORDER BY s.played_at DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        $scores = $stmt->fetchAll();
        
        sendJsonResponse(['recent_scores' => $scores]);
    }
    
    // ==========================================
    // Songs Endpoints
    // ==========================================
    private function handleSongs() {
        $id = $this->segments[2] ?? null;
        
        switch ($this->method) {
            case 'GET':
                if ($id) {
                    $this->getSong($id);
                } else {
                    $this->listSongs();
                }
                break;
                
            default:
                sendError('Method not allowed', 405);
        }
    }
    
    private function listSongs() {
        $limit = min((int)($_GET['limit'] ?? 100), 200);
        $offset = (int)($_GET['offset'] ?? 0);
        $orderBy = $_GET['sort'] ?? 'title';
        
        $allowedSort = ['title', 'artist', 'created_at'];
        $orderBy = in_array($orderBy, $allowedSort) ? $orderBy : 'title';
        
        $stmt = $this->db->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM " . DB_PREFIX . "scores WHERE song_id = s.id) as play_count,
                   (SELECT MAX(score) FROM " . DB_PREFIX . "scores WHERE song_id = s.id) as best_score
            FROM " . DB_PREFIX . "songs s
            ORDER BY $orderBy ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        $songs = $stmt->fetchAll();
        
        sendJsonResponse(['songs' => $songs]);
    }
    
    private function getSong($id) {
        $stmt = $this->db->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM " . DB_PREFIX . "scores WHERE song_id = s.id) as play_count,
                   (SELECT MAX(score) FROM " . DB_PREFIX . "scores WHERE song_id = s.id) as best_score,
                   (SELECT AVG(accuracy) FROM " . DB_PREFIX . "scores WHERE song_id = s.id) as avg_accuracy
            FROM " . DB_PREFIX . "songs s
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $song = $stmt->fetch();
        
        if (!$song) {
            sendError('Song not found', 404);
        }
        
        sendJsonResponse($song);
    }
    
    // ==========================================
    // Search Endpoint
    // ==========================================
    private function handleSearch() {
        $query = $_GET['q'] ?? '';
        
        if (strlen($query) < 2) {
            sendError('Query must be at least 2 characters', 400);
        }
        
        $query = sanitizeString($query);
        $searchTerm = "%$query%";
        
        // Search players
        $stmt = $this->db->prepare("
            SELECT id, name, country, color, total_score
            FROM " . DB_PREFIX . "players
            WHERE show_on_leaderboard = 1 AND name LIKE ?
            ORDER BY total_score DESC
            LIMIT 10
        ");
        $stmt->execute([$searchTerm]);
        $players = $stmt->fetchAll();
        
        // Search songs
        $stmt = $this->db->prepare("
            SELECT id, title, artist,
                   (SELECT COUNT(*) FROM " . DB_PREFIX . "scores WHERE song_id = " . DB_PREFIX . "songs.id) as play_count
            FROM " . DB_PREFIX . "songs
            WHERE title LIKE ? OR artist LIKE ?
            ORDER BY play_count DESC
            LIMIT 20
        ");
        $stmt->execute([$searchTerm, $searchTerm]);
        $songs = $stmt->fetchAll();
        
        sendJsonResponse([
            'query' => $query,
            'players' => $players,
            'songs' => $songs
        ]);
    }
}
