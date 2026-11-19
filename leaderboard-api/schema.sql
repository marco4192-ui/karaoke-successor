-- ============================================================
-- Karaoke Successor — Online Leaderboard Schema (v3.7)
-- Copyright-safe: No song titles/artists/lyrics stored.
-- Songs are identified solely by a SHA-256 fingerprint hash.
-- Anti-cheat: proof verification columns.
-- v3: Daily-challenge online board (ks_daily_results) added.
-- v3.2: App-only online accounts (ks_accounts): e-mail + bcrypt login.
-- v3.5: Recovery codes (R69).
-- v3.6: ks_play_log + ks_nonces, sync_code widened to VARCHAR(16).
-- v3.7 (R81): SCORE SYSTEM REBUILD —
--   * Battle-Royale win counter REMOVED (br_wins/br_wins_at dropped from
--     ks_profiles, POST /br removed from the API). BR has no comparable
--     score scale (2-player BR ≠ 25-player BR) — fakeable and worthless.
--   * ks_scores: difficulty is now part of the best-score key
--     (profile_uid, song_hash, game_type, difficulty) — every difficulty
--     keeps its own best, so difficulty filters on the boards are true
--     per-difficulty bests instead of "the winning row happens to be X".
--   * ks_daily_results: difficulty is now part of the unique key
--     (profile_uid, challenge_date, challenge_type, difficulty) — the
--     per-stage Top-3 boxes can rank per difficulty individually.
--   * challenge_type accepts the full 200-type daily pool of the client
--     (dailyTypeMeta in index.php is generated from challenge-pools.ts).
-- FRESH-INSTALL schema: re-importing replaces the whole database
-- (existing scores / daily results / accounts are lost — by design for
-- the v3.7 rebuild; the app re-registers on its next game).
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- Table: ks_profiles
-- Player profiles with privacy controls.
-- profile_uid is a UUID set by the client app.
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `ks_scores`;
DROP TABLE IF EXISTS `ks_daily_results`;
DROP TABLE IF EXISTS `ks_accounts`;
DROP TABLE IF EXISTS `ks_play_log`;
DROP TABLE IF EXISTS `ks_nonces`;
DROP TABLE IF EXISTS `ks_profile_sync`;
DROP TABLE IF EXISTS `ks_profiles`;

CREATE TABLE `ks_profiles` (
  `profile_uid`    VARCHAR(36)  NOT NULL                 COMMENT 'UUID from client app (portable across devices)',
  `display_name`   VARCHAR(64)  NOT NULL                 COMMENT 'Chosen display name',
  `color`          VARCHAR(7)   NOT NULL DEFAULT '#8B5CF6' COMMENT 'Hex color without alpha',
  `country_code`   CHAR(2)      NULL     DEFAULT NULL     COMMENT 'ISO 3166-1 alpha-2, nullable',
  `show_on_board`  TINYINT(1)   NOT NULL DEFAULT 1       COMMENT 'Opt-in to leaderboard visibility',
  `show_country`   TINYINT(1)   NOT NULL DEFAULT 1       COMMENT 'Show country flag on leaderboard',
  `sync_code`      VARCHAR(16)  NULL     DEFAULT NULL     COMMENT 'Profile ownership token (12 chars for new profiles, legacy 8 chars; A-Z0-9). Required for writes to this profile; also the profile-sync retrieval code.',
  `total_score`    BIGINT       NOT NULL DEFAULT 0       COMMENT 'Cached sum of best scores',
  `best_score`     INT          NOT NULL DEFAULT 0       COMMENT 'Cached single best score',
  `songs_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached count of distinct songs with scores',
  `games_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached count of distinct (song, game_type) bests',
  `avg_accuracy`   DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Cached average accuracy',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_uid`),
  UNIQUE KEY `uq_sync_code` (`sync_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_play_log (v3.6)
-- One row per ACCEPTED score submission (a log, not a best-value table:
-- every finished game appends, regardless of personal best). Powers
-- GET /profiles/{uid}/plays (recent plays) and the month/week window
-- boards. Retention: rows older than 400 days are pruned
-- probabilistically (~1 % of submissions trigger a cleanup).
-- NOTE: no song titles here either — the song_hash fingerprint is the
-- only song reference (copyright-safe by design).
-- -----------------------------------------------------------
CREATE TABLE `ks_play_log` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `profile_uid` VARCHAR(36)  NOT NULL                COMMENT 'References ks_profiles',
  `song_hash`   VARCHAR(80)  NOT NULL                COMMENT 'v1 fingerprint (same key as ks_scores.song_hash)',
  `game_type`   ENUM('s','d') NOT NULL                COMMENT 's = single/duel, d = duet',
  `score`       INT          NOT NULL                COMMENT 'Points scored in this round',
  `accuracy`    DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Accuracy of this round',
  `difficulty`  ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pl_profile_created` (`profile_uid`, `created_at`),
  KEY `idx_pl_created` (`created_at`),
  KEY `idx_pl_song` (`song_hash`),
  CONSTRAINT `fk_pl_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_nonces (v3.6)
-- Replay protection: the client generates a fresh 32-hex-char nonce per
-- write request; the server INSERTs it — a duplicate primary key means
-- the request was replayed (or a retry raced) and is rejected with 409.
-- Optional for POST /scores (legacy clients). Rows older than 1 day are
-- pruned probabilistically.
-- -----------------------------------------------------------
CREATE TABLE `ks_nonces` (
  `nonce`      CHAR(32)  NOT NULL COMMENT 'Random hex nonce from the client (one per write attempt)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nonce`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_profile_sync
-- Private per-profile backup used by the "profile sync" feature.
-- snapshot: the full local profile (name, color, country, xp,
--   achievements, stats, privacy settings).
-- scores:   the local highscore list. NOTE: this is personal backup
--   data and may contain local song titles — it is never exposed on
--   any public leaderboard and only returned to whoever presents the
--   matching sync_code.
-- -----------------------------------------------------------
CREATE TABLE `ks_profile_sync` (
  `profile_uid` VARCHAR(36) NOT NULL,
  `snapshot`    JSON        NOT NULL COMMENT 'Full profile snapshot (JSON)',
  `scores`      JSON        NULL     COMMENT 'Highscore snapshot (JSON), optional',
  `updated_at`  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_uid`),
  CONSTRAINT `fk_sync_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_scores (v3.7)
-- One row per (profile_uid, song_hash, game_type, difficulty) — every
-- difficulty keeps its own best. If a player beats their own score on
-- the same difficulty, the row is UPDATEd (upsert).
-- v2: anti-cheat columns (verified, ac_flags, song_hash_v2).
-- -----------------------------------------------------------
CREATE TABLE `ks_scores` (
  `id`                 BIGINT       NOT NULL AUTO_INCREMENT,
  `profile_uid`        VARCHAR(36)  NOT NULL                 COMMENT 'References ks_profiles',
  `song_hash`          VARCHAR(80)  NOT NULL                 COMMENT 'v1:hex (legacy signed-word form may contain -) — copyright-safe song fingerprint',
  `song_hash_v2`       VARCHAR(80)  NULL     DEFAULT NULL     COMMENT 'v2:hex (same legacy form) — enhanced fingerprint (nullable, for migration)',
  `game_type`          ENUM('s','d') NOT NULL                COMMENT 's = single/duel, d = duet (vs-mode)',
  `score`              INT          NOT NULL                 COMMENT 'Points scored',
  `max_score`          INT          NOT NULL DEFAULT 10000   COMMENT 'Max possible score for that song',
  `accuracy`           DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Percentage accuracy',
  `max_combo`          INT          NOT NULL DEFAULT 0       COMMENT 'Highest combo achieved',
  `difficulty`         ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal',
  `rating`             ENUM('perfect','excellent','good','okay','poor') NOT NULL DEFAULT 'good',
  `notes_hit`          INT          NOT NULL DEFAULT 0,
  `notes_missed`       INT          NOT NULL DEFAULT 0,
  `verified`           TINYINT(1)   NOT NULL DEFAULT 0       COMMENT '1 = passed anti-cheat integrity hash + plausibility',
  `ac_flags`           JSON         NULL     DEFAULT NULL     COMMENT 'Soft anti-cheat flags (JSON array of strings)',
  `ac_reject_reason`   VARCHAR(255) NULL     DEFAULT NULL     COMMENT 'Reason if anti-cheat rejected the proof (null = no proof / accepted)',
  `fingerprint_version` ENUM('v1','v2') NOT NULL DEFAULT 'v1' COMMENT 'Which fingerprint version was used',
  `played_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When this score was achieved (or last improved)',
  `created_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First submission',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_song_type_diff` (`profile_uid`, `song_hash`, `game_type`, `difficulty`),
  KEY `idx_song_hash` (`song_hash`),
  KEY `idx_song_hash_v2` (`song_hash_v2`),
  KEY `idx_score` (`score` DESC),
  KEY `idx_verified` (`verified`),
  CONSTRAINT `fk_score_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_daily_results (v3.7)
-- Daily-challenge online board. One row per
-- (profile_uid, challenge_date, challenge_type, difficulty): replaying
-- the same challenge on the same day at the same difficulty keeps the
-- BEST metric_value (upsert, direction-aware per type).
-- challenge_type: the full 200-type daily pool of the client
-- (generated map in index.php dailyTypeMeta()).
-- -----------------------------------------------------------
CREATE TABLE `ks_daily_results` (
  `id`             BIGINT        NOT NULL AUTO_INCREMENT,
  `profile_uid`    VARCHAR(36)   NOT NULL                 COMMENT 'References ks_profiles',
  `challenge_date` DATE          NOT NULL                 COMMENT 'Challenge day (YYYY-MM-DD, client local time)',
  `challenge_type` VARCHAR(40)   NOT NULL                 COMMENT 'Daily challenge variant (200-type pool, see dailyTypeMeta in index.php)',
  `difficulty`     VARCHAR(12)   NOT NULL DEFAULT 'normal' COMMENT 'Selected tier: easy|normal|hard|very_hard|insane',
  `metric_value`   DECIMAL(10,2) NOT NULL                 COMMENT 'Challenge metric (better = higher, except min-direction types)',
  `xp_earned`      INT           NOT NULL DEFAULT 0       COMMENT 'XP earned locally for this challenge (informational)',
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First submission',
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_date_type_diff` (`profile_uid`, `challenge_date`, `challenge_type`, `difficulty`),
  KEY `idx_date` (`challenge_date`),
  KEY `idx_type` (`challenge_date`, `challenge_type`, `difficulty`),
  CONSTRAINT `fk_daily_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_accounts
-- App-only online accounts (e-mail + password login).
-- Purpose: load an online profile on another device / location.
--   email: lowercase, unique. Never shown publicly anywhere.
--   password_hash: bcrypt (password_hash()).
--   recovery_hash: bcrypt hash of the one-time recovery code (R69,
--     rotated on every use).
--   profile_uid: the linked profile — exactly one account per profile
--     and one profile per account (both enforced by unique keys).
--   failed_attempts / locked_until: brute-force lockout
--     (5 consecutive failures = 15 minutes lock).
-- Security: the API has no HTML endpoints, no sessions and no cookies;
--   every request (including /auth/login) requires the X-API-Key header
--   that only the karaoke app ships. A browser cannot log in.
-- -----------------------------------------------------------
CREATE TABLE `ks_accounts` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `email`           VARCHAR(254) NOT NULL                COMMENT 'Lowercase login e-mail (app-only)',
  `password_hash`   VARCHAR(255) NOT NULL                COMMENT 'bcrypt hash',
  `recovery_hash`   VARCHAR(255) NULL     DEFAULT NULL   COMMENT 'bcrypt hash of the one-time recovery code (R69; rotated on every use)',
  `profile_uid`     VARCHAR(36)  NOT NULL                COMMENT 'Linked ks_profiles.profile_uid',
  `failed_attempts` INT          NOT NULL DEFAULT 0      COMMENT 'Consecutive failed logins (lockout counter)',
  `locked_until`    DATETIME     NULL     DEFAULT NULL   COMMENT 'Lockout expiry (15 min after 5 fails)',
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  UNIQUE KEY `uq_account_profile` (`profile_uid`),
  CONSTRAINT `fk_account_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Stored Procedure: Update cached profile stats after score
-- v3.7: games_played counts DISTINCT (song_hash, game_type) pairs —
-- with difficulty in the best-score key a profile holds up to three
-- rows per song; counting rows would triple-count one performance.
-- -----------------------------------------------------------
DELIMITER //
DROP PROCEDURE IF EXISTS `sp_refresh_profile_stats`//
CREATE PROCEDURE `sp_refresh_profile_stats`(IN p_uid VARCHAR(36))
BEGIN
  UPDATE `ks_profiles` SET
    `total_score`  = (SELECT COALESCE(SUM(`score`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `best_score`   = (SELECT COALESCE(MAX(`score`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `songs_played` = (SELECT COUNT(DISTINCT `song_hash`) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `games_played` = (SELECT COUNT(DISTINCT `song_hash`, `game_type`) FROM `ks_scores` WHERE `profile_uid` = p_uid),
    `avg_accuracy` = (SELECT COALESCE(AVG(`accuracy`), 0) FROM `ks_scores` WHERE `profile_uid` = p_uid)
  WHERE `profile_uid` = p_uid;
END//
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
