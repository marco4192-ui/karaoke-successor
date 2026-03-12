<?php
/**
 * Karaoke Leaderboard API
 * Main entry point - routes all requests
 */

require_once __DIR__ . '/config.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];
$path = parse_url($path, PHP_URL_PATH);
$path = rtrim($path, '/');

// Remove query string and get path segments
$basePath = '/api'; // Change this if your API is in a subdirectory
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

// Route the request
try {
    $db = getDB();
    
    switch (true) {
        // GET / - API info
        case $method === 'GET' && $path === '':
        case $method === 'GET' && $path === '/':
            sendJSON([
                'name' => 'Karaoke Leaderboard API',
                'version' => '1.0.0',
                'endpoints' => [
                    'GET /players' => 'List all players',
                    'GET /players/{id}' => 'Get player by ID',
                    'POST /players' => 'Create or update player',
                    'GET /songs' => 'List all songs',
                    'GET /songs/{id}' => 'Get song with leaderboard',
                    'POST /songs' => 'Add new song',
                    'GET /leaderboard' => 'Get global leaderboard',
                    'GET /leaderboard/{songId}' => 'Get leaderboard for a song',
                    'POST /scores' => 'Submit a new score',
                    'GET /player/{id}/songs' => 'Get all songs a player has scores for',
                ]
            ]);
            break;

        // GET /players - List all players
        case $method === 'GET' && $path === '/players':
            $stmt = $db->query("SELECT * FROM " . table('players') . " WHERE show_on_leaderboard = 1 ORDER BY total_score DESC");
            $players = $stmt->fetchAll();
            
            // Apply privacy settings
            $players = array_map(function($p) {
                unset($p['email']);
                if (!$p['show_photo']) unset($p['avatar']);
                if (!$p['show_country']) unset($p['country']);
                return $p;
            }, $players);
            
            sendJSON(['players' => $players]);
            break;

        // GET /players/{id} - Get player by ID
        case $method === 'GET' && preg_match('#^/players/([^/]+)$#', $path, $matches):
            $playerId = sanitize($matches[1]);
            $stmt = $db->prepare("SELECT * FROM " . table('players') . " WHERE id = ?");
            $stmt->execute([$playerId]);
            $player = $stmt->fetch();
            
            if (!$player) {
                sendError('Player not found', 404);
            }
            
            // Apply privacy
            unset($player['email']);
            if (!$player['show_photo']) unset($player['avatar']);
            if (!$player['show_country']) unset($player['country']);
            
            sendJSON(['player' => $player]);
            break;

        // POST /players - Create or update player
        case $method === 'POST' && $path === '/players':
            validateAPIKey();
            $data = getJSONInput();
            
            $id = $data['id'] ?? generatePlayerId();
            $name = sanitize($data['name'] ?? 'Anonymous');
            $avatar = $data['avatar'] ?? null;
            $country = $data['country'] ?? null;
            $showOnLeaderboard = isset($data['showOnLeaderboard']) ? (int)$data['showOnLeaderboard'] : 1;
            $showPhoto = isset($data['showPhoto']) ? (int)$data['showPhoto'] : 1;
            $showCountry = isset($data['showCountry']) ? (int)$data['showCountry'] : 1;
            
            // Validate country code
            if ($country && !isValidCountryCode($country)) {
                sendError('Invalid country code', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO " . table('players') . " (id, name, avatar, country, show_on_leaderboard, show_photo, show_country, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name),
                    avatar = VALUES(avatar),
                    country = VALUES(country),
                    show_on_leaderboard = VALUES(show_on_leaderboard),
                    show_photo = VALUES(show_photo),
                    show_country = VALUES(show_country),
                    updated_at = NOW()
            ");
            $stmt->execute([$id, $name, $avatar, $country, $showOnLeaderboard, $showPhoto, $showCountry]);
            
            sendJSON(['success' => true, 'player_id' => $id], 201);
            break;

        // POST /profiles - Upload full player profile (with stats)
        case $method === 'POST' && $path === '/profiles':
            validateAPIKey();
            $data = getJSONInput();
            
            $id = $data['id'] ?? generatePlayerId();
            $name = sanitize($data['name'] ?? 'Anonymous');
            $avatar = $data['avatar'] ?? null;
            $country = $data['country'] ?? null;
            $color = $data['color'] ?? '#FF6B6B';
            $stats = $data['stats'] ?? [];
            $highscores = $data['highscores'] ?? [];
            $achievements = $data['achievements'] ?? [];
            $settings = $data['settings'] ?? [];
            
            // Generate a sync code for the profile
            $syncCode = strtoupper(substr(md5($id . time() . rand()), 0, 8));
            
            // Serialize complex data
            $statsJson = json_encode($stats);
            $highscoresJson = json_encode($highscores);
            $achievementsJson = json_encode($achievements);
            $settingsJson = json_encode($settings);
            
            $stmt = $db->prepare("
                INSERT INTO " . table('profiles') . " 
                (id, sync_code, name, avatar, country, color, stats, highscores, achievements, settings, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name),
                    avatar = VALUES(avatar),
                    country = VALUES(country),
                    color = VALUES(color),
                    stats = VALUES(stats),
                    highscores = VALUES(highscores),
                    achievements = VALUES(achievements),
                    settings = VALUES(settings),
                    updated_at = NOW()
            ");
            $stmt->execute([$id, $syncCode, $name, $avatar, $country, $color, $statsJson, $highscoresJson, $achievementsJson, $settingsJson]);
            
            sendJSON(['success' => true, 'player_id' => $id, 'sync_code' => $syncCode], 201);
            break;

        // GET /profiles/{id} - Get full profile by ID
        case $method === 'GET' && preg_match('#^/profiles/([^/]+)$#', $path, $matches):
            $profileId = sanitize($matches[1]);
            
            $stmt = $db->prepare("SELECT * FROM " . table('profiles') . " WHERE id = ?");
            $stmt->execute([$profileId]);
            $profile = $stmt->fetch();
            
            if (!$profile) {
                sendError('Profile not found', 404);
            }
            
            // Decode JSON fields
            $profile['stats'] = json_decode($profile['stats'], true);
            $profile['highscores'] = json_decode($profile['highscores'], true);
            $profile['achievements'] = json_decode($profile['achievements'], true);
            $profile['settings'] = json_decode($profile['settings'], true);
            
            sendJSON(['profile' => $profile]);
            break;

        // GET /profiles/code/{syncCode} - Get profile by sync code
        case $method === 'GET' && preg_match('#^/profiles/code/([^/]+)$#', $path, $matches):
            $syncCode = strtoupper(sanitize($matches[1]));
            
            $stmt = $db->prepare("SELECT * FROM " . table('profiles') . " WHERE sync_code = ?");
            $stmt->execute([$syncCode]);
            $profile = $stmt->fetch();
            
            if (!$profile) {
                sendError('Profile not found', 404);
            }
            
            // Decode JSON fields
            $profile['stats'] = json_decode($profile['stats'], true);
            $profile['highscores'] = json_decode($profile['highscores'], true);
            $profile['achievements'] = json_decode($profile['achievements'], true);
            $profile['settings'] = json_decode($profile['settings'], true);
            
            sendJSON(['profile' => $profile]);
            break;

        // GET /songs - List all songs
        case $method === 'GET' && $path === '/songs':
            $stmt = $db->query("SELECT * FROM " . table('songs') . " ORDER BY title");
            $songs = $stmt->fetchAll();
            sendJSON(['songs' => $songs]);
            break;

        // GET /songs/{id} - Get song with leaderboard
        case $method === 'GET' && preg_match('#^/songs/([^/]+)$#', $path, $matches):
            $songId = sanitize($matches[1]);
            
            // Get song
            $stmt = $db->prepare("SELECT * FROM " . table('songs') . " WHERE id = ?");
            $stmt->execute([$songId]);
            $song = $stmt->fetch();
            
            if (!$song) {
                sendError('Song not found', 404);
            }
            
            // Get leaderboard for this song
            $stmt = $db->prepare("
                SELECT s.*, p.name as player_name, p.avatar, p.country
                FROM " . table('scores') . " s
                JOIN " . table('players') . " p ON s.player_id = p.id
                WHERE s.song_id = ? AND p.show_on_leaderboard = 1
                ORDER BY s.score DESC
                LIMIT 100
            ");
            $stmt->execute([$songId]);
            $leaderboard = $stmt->fetchAll();
            
            // Apply privacy
            $leaderboard = array_map(function($entry) {
                return $entry;
            }, $leaderboard);
            
            sendJSON(['song' => $song, 'leaderboard' => $leaderboard]);
            break;

        // POST /songs - Add new song
        case $method === 'POST' && $path === '/songs':
            validateAPIKey();
            $data = getJSONInput();
            
            $id = sanitize($data['id'] ?? '');
            $title = sanitize($data['title'] ?? '');
            $artist = sanitize($data['artist'] ?? '');
            $duration = (int)($data['duration'] ?? 0);
            $difficulty = (int)($data['difficulty'] ?? 1);
            
            if (empty($id) || empty($title)) {
                sendError('Song ID and title are required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO " . table('songs') . " (id, title, artist, duration, difficulty)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title),
                    artist = VALUES(artist),
                    duration = VALUES(duration),
                    difficulty = VALUES(difficulty)
            ");
            $stmt->execute([$id, $title, $artist, $duration, $difficulty]);
            
            sendJSON(['success' => true, 'song_id' => $id], 201);
            break;

        // GET /leaderboard - Global leaderboard
        case $method === 'GET' && $path === '/leaderboard':
            $limit = min((int)($_GET['limit'] ?? 100), 500);
            $offset = (int)($_GET['offset'] ?? 0);
            
            $stmt = $db->prepare("
                SELECT p.id, p.name, p.avatar, p.country, p.total_score, p.games_played
                FROM " . table('players') . " p
                WHERE p.show_on_leaderboard = 1
                ORDER BY p.total_score DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $leaderboard = $stmt->fetchAll();
            
            sendJSON(['leaderboard' => $leaderboard]);
            break;

        // GET /leaderboard/{songId} - Song leaderboard
        case $method === 'GET' && preg_match('#^/leaderboard/([^/]+)$#', $path, $matches):
            $songId = sanitize($matches[1]);
            $limit = min((int)($_GET['limit'] ?? 100), 500);
            
            $stmt = $db->prepare("
                SELECT s.*, p.name as player_name, p.avatar, p.country
                FROM " . table('scores') . " s
                JOIN " . table('players') . " p ON s.player_id = p.id
                WHERE s.song_id = ? AND p.show_on_leaderboard = 1
                ORDER BY s.score DESC
                LIMIT ?
            ");
            $stmt->execute([$songId, $limit]);
            $leaderboard = $stmt->fetchAll();
            
            sendJSON(['leaderboard' => $leaderboard]);
            break;

        // POST /scores - Submit new score
        case $method === 'POST' && $path === '/scores':
            validateAPIKey();
            $data = getJSONInput();
            
            $playerId = sanitize($data['playerId'] ?? '');
            $songId = sanitize($data['songId'] ?? '');
            $score = (int)($data['score'] ?? 0);
            $maxScore = (int)($data['maxScore'] ?? 10000);
            $difficulty = (int)($data['difficulty'] ?? 1);
            $gameMode = sanitize($data['gameMode'] ?? 'standard');
            $perfectNotes = (int)($data['perfectNotes'] ?? 0);
            $goodNotes = (int)($data['goodNotes'] ?? 0);
            $missedNotes = (int)($data['missedNotes'] ?? 0);
            $combo = (int)($data['combo'] ?? 0);
            
            if (empty($playerId) || empty($songId)) {
                sendError('Player ID and Song ID are required', 400);
            }
            
            // Verify player exists
            $stmt = $db->prepare("SELECT id FROM " . table('players') . " WHERE id = ?");
            $stmt->execute([$playerId]);
            if (!$stmt->fetch()) {
                sendError('Player not found', 404);
            }
            
            // Insert score
            $stmt = $db->prepare("
                INSERT INTO " . table('scores') . " 
                (player_id, song_id, score, max_score, difficulty, game_mode, perfect_notes, good_notes, missed_notes, max_combo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$playerId, $songId, $score, $maxScore, $difficulty, $gameMode, $perfectNotes, $goodNotes, $missedNotes, $combo]);
            
            // Update player totals
            $stmt = $db->prepare("
                UPDATE " . table('players') . " 
                SET total_score = total_score + ?, games_played = games_played + 1
                WHERE id = ?
            ");
            $stmt->execute([$score, $playerId]);
            
            // Check for new high score
            $stmt = $db->prepare("
                SELECT COUNT(*) as rank FROM " . table('scores') . " 
                WHERE song_id = ? AND score > ?
            ");
            $stmt->execute([$songId, $score]);
            $rank = $stmt->fetch()['rank'] + 1;
            
            sendJSON([
                'success' => true,
                'score_id' => $db->lastInsertId(),
                'rank' => $rank,
                'is_new_high_score' => $rank === 1
            ], 201);
            break;

        // GET /player/{id}/songs - Get all songs a player has scores for
        case $method === 'GET' && preg_match('#^/player/([^/]+)/songs$#', $path, $matches):
            $playerId = sanitize($matches[1]);
            
            $stmt = $db->prepare("
                SELECT s.*, songs.title, songs.artist, songs.difficulty as song_difficulty
                FROM " . table('scores') . " s
                JOIN " . table('songs') . " songs ON s.song_id = songs.id
                WHERE s.player_id = ?
                ORDER BY s.score DESC
            ");
            $stmt->execute([$playerId]);
            $scores = $stmt->fetchAll();
            
            sendJSON(['scores' => $scores]);
            break;

        default:
            sendError('Endpoint not found', 404);
    }
    
} catch (PDOException $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}
