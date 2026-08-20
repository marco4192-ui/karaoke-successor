-- ============================================================
-- Karaoke Successor — Online Leaderboard Schema (v1)
-- Copyright-safe: No song titles/artists/lyrics stored.
-- Songs are identified solely by a SHA-256 fingerprint hash.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- Table: ks_profiles
-- Player profiles with privacy controls.
-- profile_uid is a UUID set by the client app.
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `ks_scores`;
DROP TABLE IF EXISTS `ks_profiles`;

CREATE TABLE `ks_profiles` (
  `profile_uid`    VARCHAR(36)  NOT NULL                 COMMENT 'UUID from client app (portable across devices)',
  `display_name`   VARCHAR(64)  NOT NULL                 COMMENT 'Chosen display name',
  `color`          VARCHAR(7)   NOT NULL DEFAULT '#8B5CF6' COMMENT 'Hex color without alpha',
  `country_code`   CHAR(2)      NULL     DEFAULT NULL     COMMENT 'ISO 3166-1 alpha-2, nullable',
  `show_on_board`  TINYINT(1)   NOT NULL DEFAULT 1       COMMENT 'Opt-in to leaderboard visibility',
  `show_country`   TINYINT(1)   NOT NULL DEFAULT 1       COMMENT 'Show country flag on leaderboard',
  `total_score`    BIGINT       NOT NULL DEFAULT 0       COMMENT 'Cached sum of best scores',
  `best_score`     INT          NOT NULL DEFAULT 0       COMMENT 'Cached single best score',
  `songs_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached count of distinct songs with scores',
  `games_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached total submissions',
  `avg_accuracy`   DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Cached average accuracy',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_scores
-- One row per (profile_uid, song_hash, game_type).
-- If a player beats their own score, the row is UPDATEd (upsert).
-- -----------------------------------------------------------
CREATE TABLE `ks_scores` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT,
  `profile_uid`    VARCHAR(36)  NOT NULL                 COMMENT 'References ks_profiles',
  `song_hash`      VARCHAR(80)  NOT NULL                 COMMENT 'v1:hex — copyright-safe song fingerprint',
  `game_type`      ENUM('s','d') NOT NULL                COMMENT 's = single/duel, d = duet (vs-mode)',
  `score`          INT          NOT NULL                 COMMENT 'Points scored',
  `max_score`      INT          NOT NULL DEFAULT 10000   COMMENT 'Max possible score for that song',
  `accuracy`       DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Percentage accuracy',
  `max_combo`      INT          NOT NULL DEFAULT 0       COMMENT 'Highest combo achieved',
  `difficulty`     ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal',
  `rating`         ENUM('perfect','excellent','good','okay','poor') NOT NULL DEFAULT 'good',
  `notes_hit`      INT          NOT NULL DEFAULT 0,
  `notes_missed`   INT          NOT NULL DEFAULT 0,
  `played_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When this score was achieved (or last improved)',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First submission',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_song_type` (`profile_uid`, `song_hash`, `game_type`),
  KEY `idx_song_hash` (`song_hash`),
  KEY `idx_score` (`score` DESC),
  CONSTRAINT `fk_score_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Stored Procedure: Update cached profile stats after score
-- -----------------------------------------------------------
DELIMITER //
DROP PROCEDURE IF EXISTS `sp_refresh_profile_stats`//
CREATE PROCEDURE `sp_refresh_profile_stats`(IN p_uid VARCHAR(36))
BEGIN
  UPDATE `ks_profiles` SET
    `total_score`  = (SELECT COALESCE(SUM(`score`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `best_score`   = (SELECT COALESCE(MAX(`score`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `songs_played` = (SELECT COUNT(DISTINCT `song_hash`) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `games_played` = (SELECT COUNT(*) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `avg_accuracy` = (SELECT COALESCE(AVG(`accuracy`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid)
  WHERE `profile_uid` = p_uid;
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
