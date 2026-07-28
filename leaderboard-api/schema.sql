-- ============================================
-- Karaoke Leaderboard Database Schema
-- MySQL 5.7+ / MariaDB 10.3+
-- ============================================
-- 
-- Run this SQL to create the database tables.
-- You can do this via phpMyAdmin or MySQL command line.
--

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS `karaoke_leaderboard` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `karaoke_leaderboard`;

-- ============================================
-- Players Table
-- Stores player profiles and their settings
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_players` (
    `id` VARCHAR(32) NOT NULL PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `country` VARCHAR(2) NULL DEFAULT 'DE',
    `color` VARCHAR(7) DEFAULT '#8B5CF6',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Privacy Settings
    `show_on_leaderboard` TINYINT(1) NOT NULL DEFAULT 1,
    `show_photo` TINYINT(1) NOT NULL DEFAULT 1,
    `show_country` TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Stats (cached for performance)
    `total_score` BIGINT NOT NULL DEFAULT 0,
    `games_played` INT NOT NULL DEFAULT 0,
    `songs_completed` INT NOT NULL DEFAULT 0,
    `best_score` INT NOT NULL DEFAULT 0,
    `avg_accuracy` DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    INDEX `idx_name` (`name`),
    INDEX `idx_total_score` (`total_score` DESC),
    INDEX `idx_show_leaderboard` (`show_on_leaderboard`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Songs Table
-- Stores song information for reference
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_songs` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `artist` VARCHAR(255) NOT NULL,
    `duration` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_title` (`title`),
    INDEX `idx_artist` (`artist`),
    FULLTEXT INDEX `idx_search` (`title`, `artist`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Scores Table
-- Individual score entries
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_scores` (
    `id` VARCHAR(32) NOT NULL PRIMARY KEY,
    `player_id` VARCHAR(32) NOT NULL,
    `song_id` VARCHAR(64) NOT NULL,
    `score` INT NOT NULL,
    `accuracy` DECIMAL(5,2) NOT NULL,
    `max_combo` INT NOT NULL DEFAULT 0,
    `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    `game_mode` VARCHAR(50) NOT NULL DEFAULT 'standard',
    `rating` ENUM('perfect', 'excellent', 'good', 'okay', 'poor') NOT NULL DEFAULT 'good',
    `notes_hit` INT NOT NULL DEFAULT 0,
    `notes_missed` INT NOT NULL DEFAULT 0,
    `played_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `duration_played` INT NOT NULL DEFAULT 0,
    
    -- Duet mode fields
    `is_duet` TINYINT(1) NOT NULL DEFAULT 0,
    `harmony_score` INT NULL,
    
    INDEX `idx_player_id` (`player_id`),
    INDEX `idx_song_id` (`song_id`),
    INDEX `idx_score` (`score` DESC),
    INDEX `idx_played_at` (`played_at` DESC),
    INDEX `idx_player_song` (`player_id`, `song_id`),
    
    FOREIGN KEY (`player_id`) REFERENCES `karaoke_players`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Achievements Table
-- Player achievements
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_achievements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `player_id` VARCHAR(32) NOT NULL,
    `achievement_id` VARCHAR(50) NOT NULL,
    `unlocked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY `unique_player_achievement` (`player_id`, `achievement_id`),
    INDEX `idx_player_id` (`player_id`),
    
    FOREIGN KEY (`player_id`) REFERENCES `karaoke_players`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Daily Challenges Table
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_daily_challenges` (
    `id` VARCHAR(32) NOT NULL PRIMARY KEY,
    `date` DATE NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `target` INT NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `reward` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY `unique_date_type` (`date`, `type`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Challenge Completions Table
-- ============================================
CREATE TABLE IF NOT EXISTS `karaoke_challenge_completions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `challenge_id` VARCHAR(32) NOT NULL,
    `player_id` VARCHAR(32) NOT NULL,
    `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `progress` INT NOT NULL DEFAULT 0,
    
    UNIQUE KEY `unique_challenge_player` (`challenge_id`, `player_id`),
    
    FOREIGN KEY (`player_id`) REFERENCES `karaoke_players`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Views for common queries
-- ============================================

-- Global Leaderboard View
CREATE OR REPLACE VIEW `view_global_leaderboard` AS
SELECT 
    p.id,
    p.name,
    p.avatar_url,
    p.country,
    p.color,
    p.show_photo,
    p.show_country,
    p.total_score,
    p.games_played,
    p.avg_accuracy,
    p.best_score,
    RANK() OVER (ORDER BY p.total_score DESC) as rank_position
FROM `karaoke_players` p
WHERE p.show_on_leaderboard = 1
ORDER BY p.total_score DESC;

-- Song Leaderboard View
CREATE OR REPLACE VIEW `view_song_leaderboard` AS
SELECT 
    s.id as score_id,
    s.player_id,
    s.song_id,
    s.score,
    s.accuracy,
    s.max_combo,
    s.difficulty,
    s.played_at,
    s.rating,
    p.name as player_name,
    p.avatar_url,
    p.country,
    p.color,
    p.show_photo,
    p.show_country,
    RANK() OVER (PARTITION BY s.song_id ORDER BY s.score DESC) as rank_position
FROM `karaoke_scores` s
JOIN `karaoke_players` p ON s.player_id = p.id
WHERE p.show_on_leaderboard = 1
ORDER BY s.song_id, s.score DESC;

-- Recent Scores View
CREATE OR REPLACE VIEW `view_recent_scores` AS
SELECT 
    s.id,
    s.player_id,
    p.name as player_name,
    p.avatar_url,
    p.country,
    p.show_photo,
    p.show_country,
    s.song_id,
    songs.title as song_title,
    songs.artist as song_artist,
    s.score,
    s.accuracy,
    s.difficulty,
    s.played_at
FROM `karaoke_scores` s
JOIN `karaoke_players` p ON s.player_id = p.id
JOIN `karaoke_songs` songs ON s.song_id = songs.id
WHERE p.show_on_leaderboard = 1
ORDER BY s.played_at DESC
LIMIT 100;

-- ============================================
-- Sample Data (optional - remove in production)
-- ============================================

-- Insert a test player
-- INSERT INTO `karaoke_players` (`id`, `name`, `country`, `color`, `show_on_leaderboard`) 
-- VALUES ('test-player-001', 'TestPlayer', 'DE', '#FF6B6B', 1);

-- ============================================
-- Stored Procedures
-- ============================================

DELIMITER //

-- Get or create player
CREATE PROCEDURE IF NOT EXISTS `sp_get_or_create_player`(
    IN p_id VARCHAR(32),
    IN p_name VARCHAR(100),
    IN p_country VARCHAR(2),
    IN p_color VARCHAR(7)
)
BEGIN
    INSERT INTO `karaoke_players` (`id`, `name`, `country`, `color`)
    VALUES (p_id, p_name, p_country, p_color)
    ON DUPLICATE KEY UPDATE 
        `name` = p_name,
        `updated_at` = CURRENT_TIMESTAMP;
    
    SELECT * FROM `karaoke_players` WHERE `id` = p_id;
END //

-- Update player stats after a game
CREATE PROCEDURE IF NOT EXISTS `sp_update_player_stats`(
    IN p_player_id VARCHAR(32)
)
BEGIN
    UPDATE `karaoke_players` p
    SET 
        `total_score` = (SELECT COALESCE(SUM(score), 0) FROM `karaoke_scores` WHERE player_id = p_player_id),
        `games_played` = (SELECT COUNT(*) FROM `karaoke_scores` WHERE player_id = p_player_id),
        `best_score` = (SELECT COALESCE(MAX(score), 0) FROM `karaoke_scores` WHERE player_id = p_player_id),
        `avg_accuracy` = (SELECT COALESCE(AVG(accuracy), 0) FROM `karaoke_scores` WHERE player_id = p_player_id)
    WHERE `id` = p_player_id;
END //

DELIMITER ;

-- ============================================
-- End of Schema
-- ============================================
