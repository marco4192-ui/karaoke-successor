-- Karaoke Leaderboard Database Schema
-- Run this SQL in phpMyAdmin or your MySQL client

-- Players table
CREATE TABLE IF NOT EXISTS ks_players (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
    email VARCHAR(255) DEFAULT NULL,
    avatar VARCHAR(500) DEFAULT NULL,
    country CHAR(2) DEFAULT NULL COMMENT 'ISO 3166-1 alpha-2 country code',
    total_score BIGINT DEFAULT 0,
    games_played INT DEFAULT 0,
    
    -- Privacy settings
    show_on_leaderboard TINYINT(1) DEFAULT 1,
    show_photo TINYINT(1) DEFAULT 1,
    show_country TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_total_score (total_score DESC),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Songs table
CREATE TABLE IF NOT EXISTS ks_songs (
    id VARCHAR(128) PRIMARY KEY COMMENT 'Usually the song folder name or unique identifier',
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) DEFAULT NULL,
    duration INT DEFAULT 0 COMMENT 'Duration in seconds',
    difficulty TINYINT DEFAULT 1 COMMENT '1-5 difficulty rating',
    play_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title),
    INDEX idx_artist (artist),
    FULLTEXT INDEX ft_search (title, artist)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scores table
CREATE TABLE IF NOT EXISTS ks_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    song_id VARCHAR(128) NOT NULL,
    
    -- Score details
    score INT NOT NULL,
    max_score INT DEFAULT 10000,
    score_percentage DECIMAL(5,2) GENERATED ALWAYS AS (score / NULLIF(max_score, 0) * 100) STORED,
    
    -- Game details
    difficulty TINYINT DEFAULT 1,
    game_mode VARCHAR(20) DEFAULT 'standard' COMMENT 'standard, duet, practice, etc.',
    
    -- Performance stats
    perfect_notes INT DEFAULT 0,
    good_notes INT DEFAULT 0,
    missed_notes INT DEFAULT 0,
    max_combo INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES ks_players(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES ks_songs(id) ON DELETE CASCADE,
    
    INDEX idx_song_score (song_id, score DESC),
    INDEX idx_player_song (player_id, song_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Achievements table (optional, for future use)
CREATE TABLE IF NOT EXISTS ks_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL COMMENT 'first_song, perfect_score, 100_games, etc.',
    achievement_data JSON DEFAULT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES ks_players(id) ON DELETE CASCADE,
    
    UNIQUE INDEX idx_player_achievement (player_id, achievement_type),
    INDEX idx_type (achievement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles table (for online profile sync)
CREATE TABLE IF NOT EXISTS ks_profiles (
    id VARCHAR(64) PRIMARY KEY,
    sync_code VARCHAR(8) NOT NULL COMMENT '8-character code for easy profile loading',
    name VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
    avatar TEXT DEFAULT NULL COMMENT 'Base64 encoded or URL',
    country CHAR(2) DEFAULT NULL,
    color VARCHAR(7) DEFAULT '#FF6B6B' COMMENT 'Player color hex',
    
    -- JSON fields for complex data
    stats JSON DEFAULT NULL COMMENT 'Extended player statistics',
    highscores JSON DEFAULT NULL COMMENT 'Local highscores',
    achievements JSON DEFAULT NULL COMMENT 'Unlocked achievements',
    settings JSON DEFAULT NULL COMMENT 'User preferences',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_sync_code (sync_code),
    INDEX idx_updated (updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data (optional - remove for production)
-- INSERT INTO ks_players (id, name, country, total_score, games_played) VALUES
-- ('player_demo1', 'Demo Player', 'DE', 50000, 10);

-- INSERT INTO ks_songs (id, title, artist, difficulty) VALUES
-- ('demo_song_1', 'Demo Song', 'Demo Artist', 3);
