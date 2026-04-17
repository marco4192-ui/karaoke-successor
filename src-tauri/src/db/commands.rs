//! Tauri commands for SQLite database operations.
//!
//! These commands expose the offline SQLite database to the frontend
//! via Tauri's IPC. All commands acquire the connection mutex briefly
//! and return JSON-serializable results.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use super::DbState;

// ====================================================================
// Shared result type for batch operations
// ====================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbResult {
    pub success: bool,
    pub rows_affected: usize,
    pub message: String,
}

// ====================================================================
// Generic key-value settings
// ====================================================================

#[tauri::command]
pub fn db_get_setting(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        [&key],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("db_get_setting failed: {}", e)),
    }
}

#[tauri::command]
pub fn db_set_setting(app: AppHandle, key: String, value: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
        (&key, &value),
    ).map_err(|e| format!("db_set_setting failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: format!("Setting '{}' updated", key),
    })
}

#[tauri::command]
pub fn db_delete_setting(app: AppHandle, key: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute(
        "DELETE FROM app_settings WHERE key = ?1",
        [&key],
    ).map_err(|e| format!("db_delete_setting failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: format!("Setting '{}' deleted", key),
    })
}

#[tauri::command]
pub fn db_get_all_settings(app: AppHandle) -> Result<Vec<(String, String)>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings ORDER BY key")
        .map_err(|e| format!("db_get_all_settings failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| format!("db_get_all_settings query failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("db_get_all_settings collect failed: {}", e))?;
    Ok(rows)
}

// ====================================================================
// Song library cache
// ====================================================================

#[tauri::command]
pub fn db_save_songs(app: AppHandle, songs_json: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Parse the JSON array of songs
    let songs: Vec<serde_json::Value> = serde_json::from_str(&songs_json)
        .map_err(|e| format!("Failed to parse songs JSON: {}", e))?;

    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;

    // Clear existing songs
    tx.execute("DELETE FROM songs", [])
        .map_err(|e| format!("Failed to clear songs: {}", e))?;

    let mut count = 0;
    for song in &songs {
        tx.execute(
            "INSERT OR REPLACE INTO songs (
                id, title, artist, album, year, genre, duration, bpm,
                difficulty, rating, gap, cover_image, video_background,
                audio_url, has_embedded_audio, preview_start, preview_duration,
                folder, folder_path, date_added, last_played, play_count,
                audio_file_name, video_file_name, txt_file_name, cover_file_name, json_data
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
                ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24,
                ?25, ?26, ?27
            )",
            rusqlite::params![
                song.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                song.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                song.get("artist").and_then(|v| v.as_str()).unwrap_or(""),
                song.get("album").and_then(|v| v.as_str()),
                song.get("year").and_then(|v| v.as_i64()),
                song.get("genre").and_then(|v| v.as_str()),
                song.get("duration").and_then(|v| v.as_i64()).unwrap_or(0),
                song.get("bpm").and_then(|v| v.as_f64()).unwrap_or(120.0),
                song.get("difficulty").and_then(|v| v.as_str()).unwrap_or("medium"),
                song.get("rating").and_then(|v| v.as_f64()).unwrap_or(0.0),
                song.get("gap").and_then(|v| v.as_f64()).unwrap_or(0.0),
                song.get("coverImage").and_then(|v| v.as_str()),
                song.get("videoBackground").and_then(|v| v.as_str()),
                song.get("audioUrl").and_then(|v| v.as_str()),
                song.get("hasEmbeddedAudio").and_then(|v| v.as_i64()).unwrap_or(0),
                song.get("preview").and_then(|v| v.get("startTime")).and_then(|v| v.as_i64()),
                song.get("preview").and_then(|v| v.get("duration")).and_then(|v| v.as_i64()),
                song.get("folder").and_then(|v| v.as_str()).unwrap_or(""),
                song.get("folderPath").and_then(|v| v.as_str()).unwrap_or(""),
                song.get("dateAdded").and_then(|v| v.as_i64()).unwrap_or(0),
                song.get("lastPlayed").and_then(|v| v.as_i64()),
                song.get("playCount").and_then(|v| v.as_i64()).unwrap_or(0),
                song.get("audioFileName").and_then(|v| v.as_str()),
                song.get("videoFileName").and_then(|v| v.as_str()),
                song.get("txtFileName").and_then(|v| v.as_str()),
                song.get("coverFileName").and_then(|v| v.as_str()),
                songs_json, // store full JSON as json_data
            ],
        ).map_err(|e| format!("Failed to insert song: {}", e))?;
        count += 1;
    }

    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: count,
        message: format!("Saved {} songs to SQLite", count),
    })
}

#[tauri::command]
pub fn db_load_songs(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT json_data FROM songs WHERE json_data IS NOT NULL")
        .map_err(|e| format!("db_load_songs prepare failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("db_load_songs query failed: {}", e))?
        .filter_map(|r| r.ok())
        .filter_map(|json_str| serde_json::from_str(&json_str).ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn db_get_song_count(app: AppHandle) -> Result<i64, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM songs", [], |row| row.get(0))
        .map_err(|e| format!("db_get_song_count failed: {}", e))?;
    Ok(count)
}

#[tauri::command]
pub fn db_search_songs(app: AppHandle, query: String, limit: Option<i64>) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(100);
    let like_pattern = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "SELECT json_data FROM songs
             WHERE title LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
             ORDER BY artist ASC, title ASC
             LIMIT ?2"
        )
        .map_err(|e| format!("db_search_songs prepare failed: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![like_pattern, limit_val], |row| row.get::<_, String>(0))
        .map_err(|e| format!("db_search_songs query failed: {}", e))?
        .filter_map(|r| r.ok())
        .filter_map(|json_str| serde_json::from_str(&json_str).ok())
        .collect();
    Ok(rows)
}

// ====================================================================
// Folders
// ====================================================================

#[tauri::command]
pub fn db_save_folders(app: AppHandle, folders_json: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let folders: Vec<serde_json::Value> = serde_json::from_str(&folders_json)
        .map_err(|e| format!("Failed to parse folders JSON: {}", e))?;

    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;
    tx.execute("DELETE FROM folders", [])
        .map_err(|e| format!("Failed to clear folders: {}", e))?;

    let mut count = 0;
    for f in &folders {
        tx.execute(
            "INSERT OR REPLACE INTO folders (name, path, parent_path, is_song_folder, song_count, cover_image)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                f.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                f.get("path").and_then(|v| v.as_str()).unwrap_or(""),
                f.get("parentPath").and_then(|v| v.as_str()),
                f.get("isSongFolder").and_then(|v| v.as_i64()).unwrap_or(0),
                f.get("songCount").and_then(|v| v.as_i64()).unwrap_or(0),
                f.get("coverImage").and_then(|v| v.as_str()),
            ],
        ).map_err(|e| format!("Failed to insert folder: {}", e))?;
        count += 1;
    }
    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: count,
        message: format!("Saved {} folders", count),
    })
}

#[tauri::command]
pub fn db_load_folders(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name, path, parent_path, is_song_folder, song_count, cover_image FROM folders ORDER BY path")
        .map_err(|e| format!("db_load_folders prepare failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "name": row.get::<_, String>(0)?,
                "path": row.get::<_, String>(1)?,
                "parentPath": row.get::<_, Option<String>>(2)?,
                "isSongFolder": row.get::<_, i32>(3)? != 0,
                "songCount": row.get::<_, i32>(4)?,
                "coverImage": row.get::<_, Option<String>>(5)?,
            }))
        })
        .map_err(|e| format!("db_load_folders query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

// ====================================================================
// Root folders
// ====================================================================

#[tauri::command]
pub fn db_save_root_folders(app: AppHandle, paths: Vec<String>) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;
    tx.execute("DELETE FROM root_folders", [])
        .map_err(|e| format!("Failed to clear root_folders: {}", e))?;
    let mut count = 0;
    for path in &paths {
        tx.execute("INSERT OR REPLACE INTO root_folders (path) VALUES (?1)", [path])
            .map_err(|e| format!("Failed to insert root_folder: {}", e))?;
        count += 1;
    }
    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: count,
        message: format!("Saved {} root folders", count),
    })
}

#[tauri::command]
pub fn db_load_root_folders(app: AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT path FROM root_folders ORDER BY path")
        .map_err(|e| format!("db_load_root_folders failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("db_load_root_folders query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

// ====================================================================
// Profiles
// ====================================================================

#[tauri::command]
pub fn db_save_profile(app: AppHandle, profile_json: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let profile: serde_json::Value = serde_json::from_str(&profile_json)
        .map_err(|e| format!("Failed to parse profile JSON: {}", e))?;

    let rows = conn.execute(
        "INSERT OR REPLACE INTO profiles (
            id, name, avatar, color, total_score, games_played, songs_completed,
            achievements, stats, created_at, xp, level, is_guest, sync_token,
            last_sync_at, device_id, is_active, sync_code, json_data
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
            ?15, ?16, ?17, ?18, ?19
        )",
        rusqlite::params![
            profile.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            profile.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            profile.get("avatar").and_then(|v| v.as_str()),
            profile.get("color").and_then(|v| v.as_str()).unwrap_or("#6366f1"),
            profile.get("totalScore").and_then(|v| v.as_i64()).unwrap_or(0),
            profile.get("gamesPlayed").and_then(|v| v.as_i64()).unwrap_or(0),
            profile.get("songsCompleted").and_then(|v| v.as_i64()).unwrap_or(0),
            profile.get("achievements").map(|v| v.to_string()),
            profile.get("stats").map(|v| v.to_string()),
            profile.get("createdAt").and_then(|v| v.as_i64()).unwrap_or(0),
            profile.get("xp").and_then(|v| v.as_i64()).unwrap_or(0),
            profile.get("level").and_then(|v| v.as_i64()).unwrap_or(1),
            profile.get("isGuest").and_then(|v| v.as_i64()).unwrap_or(1),
            profile.get("syncToken").and_then(|v| v.as_str()),
            profile.get("lastSyncAt").and_then(|v| v.as_i64()),
            profile.get("deviceId").and_then(|v| v.as_str()).unwrap_or(""),
            profile.get("isActive").and_then(|v| v.as_i64()).unwrap_or(1),
            profile.get("syncCode").and_then(|v| v.as_str()),
            profile_json,
        ],
    ).map_err(|e| format!("db_save_profile failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: "Profile saved".to_string(),
    })
}

#[tauri::command]
pub fn db_load_profiles(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT json_data FROM profiles WHERE json_data IS NOT NULL")
        .map_err(|e| format!("db_load_profiles prepare failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("db_load_profiles query failed: {}", e))?
        .filter_map(|r| r.ok())
        .filter_map(|json_str| serde_json::from_str(&json_str).ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn db_delete_profile(app: AppHandle, profile_id: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute("DELETE FROM profiles WHERE id = ?1", [&profile_id])
        .map_err(|e| format!("db_delete_profile failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: format!("Profile {} deleted", profile_id),
    })
}

// ====================================================================
// Highscores
// ====================================================================

#[tauri::command]
pub fn db_save_highscore(app: AppHandle, highscore_json: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let hs: serde_json::Value = serde_json::from_str(&highscore_json)
        .map_err(|e| format!("Failed to parse highscore JSON: {}", e))?;

    let rows = conn.execute(
        "INSERT INTO highscores (
            id, player_id, player_name, song_id, song_title, score, accuracy,
            max_combo, perfect_notes, good_notes, miss_notes, difficulty,
            game_mode, rank_title, played_at, json_data
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
        )",
        rusqlite::params![
            hs.get("id").and_then(|v| v.as_str()).unwrap_or(&format!("hs-{}", chrono_now_ms())),
            hs.get("playerId").and_then(|v| v.as_str()).unwrap_or(""),
            hs.get("playerName").and_then(|v| v.as_str()).unwrap_or(""),
            hs.get("songId").and_then(|v| v.as_str()).unwrap_or(""),
            hs.get("songTitle").and_then(|v| v.as_str()).unwrap_or(""),
            hs.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0),
            hs.get("accuracy").and_then(|v| v.as_f64()).unwrap_or(0.0),
            hs.get("maxCombo").and_then(|v| v.as_i64()).unwrap_or(0),
            hs.get("perfectNotes").and_then(|v| v.as_i64()).unwrap_or(0),
            hs.get("goodNotes").and_then(|v| v.as_i64()).unwrap_or(0),
            hs.get("missNotes").and_then(|v| v.as_i64()).unwrap_or(0),
            hs.get("difficulty").and_then(|v| v.as_str()).unwrap_or("medium"),
            hs.get("gameMode").and_then(|v| v.as_str()).unwrap_or("standard"),
            hs.get("rankTitle").and_then(|v| v.as_str()),
            hs.get("playedAt").and_then(|v| v.as_i64()).unwrap_or_else(|| chrono_now_ms() as i64),
            highscore_json,
        ],
    ).map_err(|e| format!("db_save_highscore failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: "Highscore saved".to_string(),
    })
}

#[tauri::command]
pub fn db_load_highscores(
    app: AppHandle,
    player_id: Option<String>,
    song_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from("SELECT json_data FROM highscores WHERE json_data IS NOT NULL");
    let mut param_count = 0;

    if player_id.is_some() {
        param_count += 1;
        sql.push_str(&format!(" AND player_id = ?{}", param_count));
    }
    if song_id.is_some() {
        param_count += 1;
        sql.push_str(&format!(" AND song_id = ?{}", param_count));
    }

    sql.push_str(" ORDER BY score DESC");

    if let Some(_limit) = limit {
        param_count += 1;
        sql.push_str(&format!(" LIMIT ?{}", param_count));
    }

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("db_load_highscores prepare failed: {}", e))?;

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref pid) = player_id {
        params.push(Box::new(pid.clone()));
    }
    if let Some(ref sid) = song_id {
        params.push(Box::new(sid.clone()));
    }
    if let Some(lim) = limit {
        params.push(Box::new(lim));
    }

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| row.get::<_, String>(0))
        .map_err(|e| format!("db_load_highscores query failed: {}", e))?
        .filter_map(|r| r.ok())
        .filter_map(|json_str| serde_json::from_str(&json_str).ok())
        .collect();
    Ok(rows)
}

// ====================================================================
// Playlists
// ====================================================================

#[tauri::command]
pub fn db_save_playlist(app: AppHandle, playlist_json: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let pl: serde_json::Value = serde_json::from_str(&playlist_json)
        .map_err(|e| format!("Failed to parse playlist JSON: {}", e))?;

    let rows = conn.execute(
        "INSERT OR REPLACE INTO playlists (
            id, name, description, cover_image, song_ids, created_at, updated_at, song_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            pl.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            pl.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            pl.get("description").and_then(|v| v.as_str()),
            pl.get("coverImage").and_then(|v| v.as_str()),
            pl.get("songIds").map(|v| v.to_string()),
            pl.get("createdAt").and_then(|v| v.as_i64()).unwrap_or(0),
            pl.get("updatedAt").and_then(|v| v.as_i64()).unwrap_or_else(|| chrono_now_ms() as i64),
            pl.get("songCount").and_then(|v| v.as_i64()).unwrap_or(0),
        ],
    ).map_err(|e| format!("db_save_playlist failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: "Playlist saved".to_string(),
    })
}

#[tauri::command]
pub fn db_load_playlists(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, cover_image, song_ids, created_at, updated_at, song_count FROM playlists ORDER BY name")
        .map_err(|e| format!("db_load_playlists prepare failed: {}", e))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, Option<String>>(2)?,
                "coverImage": row.get::<_, Option<String>>(3)?,
                "songIds": serde_json::from_str::<serde_json::Value>(
                    &row.get::<_, String>(4).unwrap_or_else(|_| "[]".to_string())
                ).unwrap_or(serde_json::json!([])),
                "createdAt": row.get::<_, i64>(5)?,
                "updatedAt": row.get::<_, i64>(6)?,
                "songCount": row.get::<_, i32>(7)?,
            }))
        })
        .map_err(|e| format!("db_load_playlists query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub fn db_delete_playlist(app: AppHandle, playlist_id: String) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let rows = conn.execute("DELETE FROM playlists WHERE id = ?1", [&playlist_id])
        .map_err(|e| format!("db_delete_playlist failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: rows,
        message: format!("Playlist {} deleted", playlist_id),
    })
}

// ====================================================================
// Database maintenance
// ====================================================================

#[tauri::command]
pub fn db_clear_all(app: AppHandle) -> Result<DbResult, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "DELETE FROM songs;
         DELETE FROM folders;
         DELETE FROM root_folders;
         DELETE FROM profiles;
         DELETE FROM highscores;
         DELETE FROM playlists;
         DELETE FROM app_settings;"
    ).map_err(|e| format!("db_clear_all failed: {}", e))?;
    Ok(DbResult {
        success: true,
        rows_affected: 0,
        message: "All tables cleared".to_string(),
    })
}

#[tauri::command]
pub fn db_get_stats(app: AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let songs: i64 = conn.query_row("SELECT COUNT(*) FROM songs", [], |r| r.get(0)).unwrap_or(0);
    let folders: i64 = conn.query_row("SELECT COUNT(*) FROM folders", [], |r| r.get(0)).unwrap_or(0);
    let profiles: i64 = conn.query_row("SELECT COUNT(*) FROM profiles", [], |r| r.get(0)).unwrap_or(0);
    let highscores: i64 = conn.query_row("SELECT COUNT(*) FROM highscores", [], |r| r.get(0)).unwrap_or(0);
    let playlists: i64 = conn.query_row("SELECT COUNT(*) FROM playlists", [], |r| r.get(0)).unwrap_or(0);
    let settings: i64 = conn.query_row("SELECT COUNT(*) FROM app_settings", [], |r| r.get(0)).unwrap_or(0);

    let db_size = std::fs::metadata(&state.db_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "songs": songs,
        "folders": folders,
        "profiles": profiles,
        "highscores": highscores,
        "playlists": playlists,
        "settings": settings,
        "dbSizeBytes": db_size,
        "dbPath": state.db_path.to_string_lossy().to_string(),
    }))
}

// ====================================================================
// Utility
// ====================================================================

fn chrono_now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
