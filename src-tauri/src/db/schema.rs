//! Schema definition and migration for the offline SQLite database.
//!
//! Version 1: Initial schema with songs, folders, profiles, highscores,
//! playlists, and app_settings tables.
//!
//! Version 2: Add viral_hits table for chart-matching feature.

use rusqlite::Connection;

/// Current schema version. Increment for each migration.
const SCHEMA_VERSION: i32 = 2;

/// Run all pending migrations.
pub fn migrate(conn: &Connection) -> Result<(), String> {
    // Create a metadata table to track schema version
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"
    ).map_err(|e| format!("Failed to create _schema_meta: {}", e))?;

    let current_version: i32 = conn.query_row(
        "SELECT COALESCE(
            (SELECT CAST(value AS INTEGER) FROM _schema_meta WHERE key = 'version'),
            0
        )",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    if current_version < 1 {
        migrate_v1(conn)?;
    }

    if current_version < 2 {
        migrate_v2(conn)?;
    }

    // Update schema version
    conn.execute(
        "INSERT OR REPLACE INTO _schema_meta (key, value) VALUES ('version', ?1)",
        [SCHEMA_VERSION.to_string()],
    ).map_err(|e| format!("Failed to update schema version: {}", e))?;

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        -- ============================================================
        -- Song library cache
        -- ============================================================
        CREATE TABLE IF NOT EXISTS songs (
            id                TEXT PRIMARY KEY,
            title             TEXT NOT NULL,
            artist            TEXT NOT NULL,
            album             TEXT,
            year              INTEGER,
            genre             TEXT,
            duration          INTEGER NOT NULL DEFAULT 0,
            bpm               REAL    NOT NULL DEFAULT 120,
            difficulty        TEXT    NOT NULL DEFAULT 'medium',
            rating            REAL    NOT NULL DEFAULT 0,
            gap               REAL    NOT NULL DEFAULT 0,
            cover_image       TEXT,
            video_background  TEXT,
            audio_url         TEXT,
            has_embedded_audio INTEGER NOT NULL DEFAULT 0,
            preview_start     INTEGER,
            preview_duration  INTEGER,
            folder            TEXT    NOT NULL DEFAULT '',
            folder_path       TEXT    NOT NULL DEFAULT '',
            date_added        INTEGER NOT NULL DEFAULT 0,
            last_played       INTEGER,
            play_count        INTEGER NOT NULL DEFAULT 0,
            audio_file_name   TEXT,
            video_file_name   TEXT,
            txt_file_name     TEXT,
            cover_file_name   TEXT,
            json_data         TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_songs_artist  ON songs(artist);
        CREATE INDEX IF NOT EXISTS idx_songs_title   ON songs(title);
        CREATE INDEX IF NOT EXISTS idx_songs_folder  ON songs(folder);
        CREATE INDEX IF NOT EXISTS idx_songs_folder_path ON songs(folder_path);

        -- ============================================================
        -- Folder cache
        -- ============================================================
        CREATE TABLE IF NOT EXISTS folders (
            name           TEXT NOT NULL,
            path           TEXT PRIMARY KEY,
            parent_path    TEXT,
            is_song_folder INTEGER NOT NULL DEFAULT 0,
            song_count     INTEGER NOT NULL DEFAULT 0,
            cover_image    TEXT
        );

        -- ============================================================
        -- Root folders
        -- ============================================================
        CREATE TABLE IF NOT EXISTS root_folders (
            path TEXT PRIMARY KEY
        );

        -- ============================================================
        -- User profiles
        -- ============================================================
        CREATE TABLE IF NOT EXISTS profiles (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            avatar      TEXT,
            color       TEXT    NOT NULL DEFAULT '#6366f1',
            total_score INTEGER NOT NULL DEFAULT 0,
            games_played INTEGER NOT NULL DEFAULT 0,
            songs_completed INTEGER NOT NULL DEFAULT 0,
            achievements TEXT,
            stats       TEXT,
            created_at  INTEGER NOT NULL DEFAULT 0,
            xp          INTEGER NOT NULL DEFAULT 0,
            level       INTEGER NOT NULL DEFAULT 1,
            is_guest    INTEGER NOT NULL DEFAULT 1,
            sync_token  TEXT,
            last_sync_at INTEGER,
            device_id   TEXT    NOT NULL DEFAULT '',
            is_active   INTEGER NOT NULL DEFAULT 1,
            sync_code   TEXT,
            json_data   TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);

        -- ============================================================
        -- Highscores
        -- ============================================================
        CREATE TABLE IF NOT EXISTS highscores (
            id            TEXT PRIMARY KEY,
            player_id     TEXT    NOT NULL,
            player_name   TEXT    NOT NULL,
            song_id       TEXT    NOT NULL,
            song_title    TEXT    NOT NULL,
            score         REAL    NOT NULL DEFAULT 0,
            accuracy      REAL    NOT NULL DEFAULT 0,
            max_combo     INTEGER NOT NULL DEFAULT 0,
            perfect_notes INTEGER NOT NULL DEFAULT 0,
            good_notes    INTEGER NOT NULL DEFAULT 0,
            miss_notes    INTEGER NOT NULL DEFAULT 0,
            difficulty    TEXT    NOT NULL DEFAULT 'medium',
            game_mode     TEXT    NOT NULL DEFAULT 'standard',
            rank_title    TEXT,
            played_at     INTEGER NOT NULL DEFAULT 0,
            json_data     TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_highscores_player ON highscores(player_id);
        CREATE INDEX IF NOT EXISTS idx_highscores_song   ON highscores(song_id);
        CREATE INDEX IF NOT EXISTS idx_highscores_score  ON highscores(score DESC);

        -- ============================================================
        -- Playlists
        -- ============================================================
        CREATE TABLE IF NOT EXISTS playlists (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT,
            cover_image TEXT,
            song_ids    TEXT,
            created_at  INTEGER NOT NULL DEFAULT 0,
            updated_at  INTEGER NOT NULL DEFAULT 0,
            song_count  INTEGER NOT NULL DEFAULT 0
        );

        -- ============================================================
        -- App settings (key-value store)
        -- ============================================================
        CREATE TABLE IF NOT EXISTS app_settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "
    ).map_err(|e| format!("Migration v1 failed: {}", e))?;

    Ok(())
}

fn migrate_v2(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        -- ============================================================
        -- Viral / trending hits fetched from music charts
        -- ============================================================
        CREATE TABLE IF NOT EXISTS viral_hits (
            id              TEXT PRIMARY KEY,
            title           TEXT NOT NULL,
            artist          TEXT NOT NULL,
            source          TEXT    NOT NULL DEFAULT 'unknown',
            playlist_name   TEXT,
            chart_position  INTEGER,
            country         TEXT,
            fetched_at      INTEGER NOT NULL,
            matched_song_id TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_viral_hits_matched ON viral_hits(matched_song_id);
        CREATE INDEX IF NOT EXISTS idx_viral_hits_source  ON viral_hits(source);
        "
    ).map_err(|e| format!("Migration v2 failed: {}", e))?;

    Ok(())
}
