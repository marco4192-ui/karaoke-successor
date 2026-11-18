-- ============================================================
-- Karaoke Successor — Online Leaderboard Schema (v2)
-- Copyright-safe: No song titles/artists/lyrics stored.
-- Songs are identified solely by a SHA-256 fingerprint hash.
-- Anti-cheat: proof verification columns added.
-- v3: Daily-challenge online board (ks_daily_results) added.
-- v3.2: App-only online accounts (ks_accounts) added: e-mail + bcrypt
--       password login to load a profile on another device. There is NO
--       web login — the API speaks JSON only and requires the X-API-Key.
-- v3.5: Recovery codes (R69): ks_accounts.recovery_hash stores the bcrypt
--       hash of a one-time recovery code (shown once at registration or at
--       the first login on a legacy account). POST /auth/recover resets the
--       password with it and rotates to a fresh code. POST /auth/register
--       replaces a profile's account when the sync_code is presented.
-- v3.6: R72 expansion — ks_play_log (one row per accepted submission; powers
--       month/week time-window boards + recent plays), ks_nonces (anti-replay
--       for POST /scores and POST /br), ks_profiles.br_wins/br_wins_at
--       (Battle-Royale-Siege counter, 120 s min interval), sync_code widened
--       to VARCHAR(16) so NEW codes can be 12 chars (60 bits entropy; legacy
--       8-char codes stay valid).
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
  -- v3.6: widened CHAR(8) → VARCHAR(16). NEW codes are 12 chars from the
  -- unambiguous alphabet (60 bits); legacy 8-char codes stay valid until
  -- Break-Glass or a fresh registration rotates them.
  `sync_code`      VARCHAR(16)  NULL     DEFAULT NULL     COMMENT 'Profile ownership token (12 chars for new profiles, legacy 8 chars; A-Z0-9). Required for writes to this profile; also the profile-sync retrieval code.',
  -- v3.6 (R72/D): Battle-Royale win counter. Only wins are counted (a BR
  -- game has no comparable score scale); br_wins_at enforces a minimum
  -- interval of 120 s between two counted wins (a full BR round takes
  -- minutes — faster increments are spam or a double submit).
  `br_wins`        INT          NOT NULL DEFAULT 0       COMMENT 'Battle-Royale-Siege (online counter, party mode)',
  `br_wins_at`     DATETIME     NULL     DEFAULT NULL   COMMENT 'Timestamp of the last counted BR win (120 s min interval)',
  `total_score`    BIGINT       NOT NULL DEFAULT 0       COMMENT 'Cached sum of best scores',
  `best_score`     INT          NOT NULL DEFAULT 0       COMMENT 'Cached single best score',
  `songs_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached count of distinct songs with scores',
  `games_played`   INT          NOT NULL DEFAULT 0       COMMENT 'Cached total submissions',
  `avg_accuracy`   DECIMAL(5,2) NOT NULL DEFAULT 0.00   COMMENT 'Cached average accuracy',
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_uid`),
  UNIQUE KEY `uq_sync_code` (`sync_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_play_log (v3.6, R72)
-- One row per ACCEPTED score submission (a log, not a best-value table:
-- every finished game appends, regardless of personal best). Powers the
-- time-window boards (month = calendar month, week = ISO week starting
-- Monday, server timezone) and GET /profiles/{uid}/plays (recent plays).
-- Retention: rows older than 400 days are pruned probabilistically (~1 %
-- of submissions trigger a cleanup) — long enough for a yearly look-back,
-- bounded storage for a friends-&-family instance.
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
-- Table: ks_nonces (v3.6, R72)
-- Replay protection: the client generates a fresh 32-hex-char nonce per
-- write request; the server INSERTs it — a duplicate primary key means
-- the request was replayed (or a retry raced) and is rejected with 409.
-- Required for POST /br (counter!), optional for POST /scores (legacy
-- clients). Rows older than 1 day are pruned probabilistically.
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
-- Table: ks_scores
-- One row per (profile_uid, song_hash, game_type).
-- If a player beats their own score, the row is UPDATEd (upsert).
-- v2: Added anti-cheat columns (verified, ac_flags, song_hash_v2).
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
  UNIQUE KEY `uq_profile_song_type` (`profile_uid`, `song_hash`, `game_type`),
  KEY `idx_song_hash` (`song_hash`),
  KEY `idx_song_hash_v2` (`song_hash_v2`),
  KEY `idx_score` (`score` DESC),
  KEY `idx_verified` (`verified`),
  CONSTRAINT `fk_score_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_daily_results
-- Daily-challenge online board. One row per
-- (profile_uid, challenge_date, challenge_type): replaying the same
-- challenge on the same day keeps the BEST metric_value (upsert).
-- -----------------------------------------------------------
CREATE TABLE `ks_daily_results` (
  `id`             BIGINT        NOT NULL AUTO_INCREMENT,
  `profile_uid`    VARCHAR(36)   NOT NULL                 COMMENT 'References ks_profiles',
  `challenge_date` DATE          NOT NULL                 COMMENT 'Challenge day (YYYY-MM-DD, client local time)',
  `challenge_type` VARCHAR(40)   NOT NULL                 COMMENT 'Daily challenge variant (22-type pool)',
  `difficulty`     VARCHAR(12)   NOT NULL DEFAULT 'normal' COMMENT 'Selected difficulty: easy|normal|hard|very_hard|insane',
  `metric_value`   DECIMAL(10,2) NOT NULL                 COMMENT 'Challenge metric (higher = better, except min types: clean_song, steady_hand)',
  `xp_earned`      INT           NOT NULL DEFAULT 0       COMMENT 'XP earned locally for this challenge (informational)',
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First submission',
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_date_type` (`profile_uid`, `challenge_date`, `challenge_type`),
  KEY `idx_date` (`challenge_date`),
  CONSTRAINT `fk_daily_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Table: ks_accounts
-- App-only online accounts (e-mail + password login).
-- Purpose: load an online profile on another device / location.
--   email: lowercase, unique. Never shown publicly anywhere.
--   password_hash: bcrypt (password_hash()).
--   recovery_hash: bcrypt hash of the one-time recovery code (R69, nullable
--     for accounts created before v3.5 — those get a code issued at their
--     next successful login).
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

-- -----------------------------------------------------------
-- Migration: Add anti-cheat columns to existing v1 table
-- Run this if upgrading from v1 schema (not a fresh install):
-- -----------------------------------------------------------
-- ALTER TABLE `ks_scores` ADD COLUMN `song_hash_v2` VARCHAR(80) NULL DEFAULT NULL AFTER `song_hash`;
-- ALTER TABLE `ks_scores` ADD COLUMN `verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `notes_missed`;
-- ALTER TABLE `ks_scores` ADD COLUMN `ac_flags` JSON NULL DEFAULT NULL AFTER `verified`;
-- ALTER TABLE `ks_scores` ADD COLUMN `ac_reject_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `ac_flags`;
-- ALTER TABLE `ks_scores` ADD COLUMN `fingerprint_version` ENUM('v1','v2') NOT NULL DEFAULT 'v1' AFTER `ac_reject_reason`;
-- ALTER TABLE `ks_scores` ADD KEY `idx_song_hash_v2` (`song_hash_v2`);
-- ALTER TABLE `ks_scores` ADD KEY `idx_verified` (`verified`);

-- -----------------------------------------------------------
-- Migration: Add the daily-challenge table to an existing v3
-- installation (fresh installs already got it above — run only
-- ONE of the two, never both):
-- -----------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS `ks_daily_results` (
--   `id`             BIGINT        NOT NULL AUTO_INCREMENT,
--   `profile_uid`    VARCHAR(36)   NOT NULL                 COMMENT 'References ks_profiles',
--   `challenge_date` DATE          NOT NULL                 COMMENT 'Challenge day (YYYY-MM-DD, client local time)',
--   `challenge_type` VARCHAR(40)   NOT NULL                 COMMENT 'Daily challenge variant (22-type pool)',
--   `difficulty`     VARCHAR(12)   NOT NULL DEFAULT 'normal' COMMENT 'Selected difficulty: easy|normal|hard|very_hard|insane',
--   `metric_value`   DECIMAL(10,2) NOT NULL                 COMMENT 'Challenge metric (higher = better, except min types: clean_song, steady_hand)',
--   `xp_earned`      INT           NOT NULL DEFAULT 0       COMMENT 'XP earned locally for this challenge (informational)',
--   `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First submission',
--   `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `uq_profile_date_type` (`profile_uid`, `challenge_date`, `challenge_type`),
--   KEY `idx_date` (`challenge_date`),
--   CONSTRAINT `fk_daily_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Migration: widen an existing ENUM ks_daily_results table to the
-- 22-type pool + difficulty column (for installations that created
-- the table with the old ENUM variant). ENUM → VARCHAR keeps all
-- existing rows; the difficulty default preserves old submissions:
-- -----------------------------------------------------------
-- ALTER TABLE `ks_daily_results`
--   MODIFY `challenge_type` VARCHAR(40) NOT NULL COMMENT 'Daily challenge variant (22-type pool)',
--   ADD COLUMN `difficulty` VARCHAR(12) NOT NULL DEFAULT 'normal' COMMENT 'Selected difficulty: easy|normal|hard|very_hard|insane' AFTER `challenge_type`;

-- -----------------------------------------------------------
-- Migration: Add the online-accounts table to an existing v3.1
-- installation (fresh installs already got it above — run only
-- ONE of the two, never both):
-- -----------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS `ks_accounts` (
--   `id`              BIGINT       NOT NULL AUTO_INCREMENT,
--   `email`           VARCHAR(254) NOT NULL,
--   `password_hash`   VARCHAR(255) NOT NULL,
--   `profile_uid`     VARCHAR(36)  NOT NULL,
--   `failed_attempts` INT          NOT NULL DEFAULT 0,
--   `locked_until`    DATETIME     NULL DEFAULT NULL,
--   `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `uq_email` (`email`),
--   UNIQUE KEY `uq_account_profile` (`profile_uid`),
--   CONSTRAINT `fk_account_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Migration: Add the recovery-code column to an existing v3.2/v3.4
-- installation (fresh installs already got it above — run only
-- ONE of the two, never both):
-- -----------------------------------------------------------
-- ALTER TABLE `ks_accounts` ADD COLUMN `recovery_hash` VARCHAR(255) NULL DEFAULT NULL COMMENT 'bcrypt hash of the one-time recovery code (R69; rotated on every use)' AFTER `password_hash`;

-- -----------------------------------------------------------
-- Migration v3.5 → v3.6 (R72): run ALL of these on an existing v3.5
-- installation (fresh installs already got everything above — then run
-- NONE of them). Coming from ≤ v3.4? Run the recovery_hash migration
-- above FIRST, then this block.
-- -----------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS `ks_play_log` (
--   `id`          BIGINT       NOT NULL AUTO_INCREMENT,
--   `profile_uid` VARCHAR(36)  NOT NULL,
--   `song_hash`   VARCHAR(80)  NOT NULL,
--   `game_type`   ENUM('s','d') NOT NULL,
--   `score`       INT          NOT NULL,
--   `accuracy`    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
--   `difficulty`  ENUM('easy','normal','hard') NOT NULL DEFAULT 'normal',
--   `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `idx_pl_profile_created` (`profile_uid`, `created_at`),
--   KEY `idx_pl_created` (`created_at`),
--   KEY `idx_pl_song` (`song_hash`),
--   CONSTRAINT `fk_pl_profile` FOREIGN KEY (`profile_uid`) REFERENCES `ks_profiles` (`profile_uid`) ON DELETE CASCADE ON UPDATE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--
-- CREATE TABLE IF NOT EXISTS `ks_nonces` (
--   `nonce`      CHAR(32)  NOT NULL,
--   `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`nonce`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--
-- ALTER TABLE `ks_profiles`
--   ADD COLUMN `br_wins`    INT      NOT NULL DEFAULT 0 COMMENT 'Battle-Royale-Siege (online counter, party mode)' AFTER `avg_accuracy`,
--   ADD COLUMN `br_wins_at` DATETIME NULL DEFAULT NULL COMMENT 'Timestamp of the last counted BR win (120 s min interval)' AFTER `br_wins`,
--   MODIFY `sync_code` VARCHAR(16) NULL DEFAULT NULL COMMENT 'Profile ownership token (12 chars for new profiles, legacy 8 chars; A-Z0-9). Required for writes to this profile; also the profile-sync retrieval code.';

SET FOREIGN_KEY_CHECKS = 1;
