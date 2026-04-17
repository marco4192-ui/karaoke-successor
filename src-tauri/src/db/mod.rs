//! SQLite-backed local database for offline-first data storage.
//!
//! Replaces IndexedDB with a native SQLite database for:
//! - Song library cache (songs, folders, root folders)
//! - User profiles and highscores
//! - App settings
//!
//! The database file is stored in Tauri's app data directory.

pub mod schema;
pub mod commands;

use std::sync::Mutex;
use std::path::PathBuf;
use rusqlite::Connection;
use tauri::Manager;

/// Managed state holding the SQLite connection.
pub struct DbState {
    pub conn: Mutex<Connection>,
    pub db_path: PathBuf,
}

impl DbState {
    /// Open (or create) the SQLite database at `db_path`.
    /// Runs migrations to ensure the schema is up to date.
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open SQLite database: {}", e))?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
            .map_err(|e| format!("Failed to set SQLite pragmas: {}", e))?;

        // Run schema migrations
        schema::migrate(&conn)
            .map_err(|e| format!("Schema migration failed: {}", e))?;

        Ok(Self {
            conn: Mutex::new(conn),
            db_path,
        })
    }
}

/// Determine the database file path using Tauri's app data directory.
pub fn default_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(data_dir.join("karaoke.db"))
}
