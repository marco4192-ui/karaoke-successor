//! Tauri commands for the viral / trending charts feature.
//!
//! Provides:
//! - `viral_refresh_charts` — fetch charts from all sources, store in SQLite
//! - `viral_get_matched_songs` — return list of matched song IDs for the UI
//! - `viral_get_entries` — return all stored chart entries
//! - `viral_get_status` — return last fetch timestamp and count
//! - `viral_clear` — clear all cached chart data

use std::collections::HashSet;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::sources::{self, ChartEntry};
use crate::db::DbState;

// ====================================================================
// Response types
// ====================================================================

#[derive(Debug, Serialize, Clone)]
pub struct ViralMatchResult {
    pub song_id: String,
    pub song_title: String,
    pub song_artist: String,
    pub chart_entries: Vec<ViralMatchInfo>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ViralMatchInfo {
    pub title: String,
    pub artist: String,
    pub source: String,
    pub playlist_name: String,
    pub chart_position: i64,
    pub country: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ViralStatus {
    pub total_entries: i64,
    pub matched_count: i64,
    pub last_fetched_at: Option<i64>,
    pub sources: Vec<String>,
    pub country: String,
}

// ====================================================================
// Normalization for fuzzy matching
// ====================================================================

/// Normalize a string for comparison: lowercase, strip diacritics,
/// remove common suffixes like "(feat. ...)", "- Remastered", etc.
fn normalize(s: &str) -> String {
    let mut result = s.to_lowercase();

    // Remove content in parentheses and brackets
    let re = regex_removed(&mut result);

    // Strip common prefixes/suffixes
    for &suffix in &["- remastered", "- remaster", "- radio edit", "- edit",
                     "- single version", "- acoustic version", "- live",
                     " (remastered)", " (remaster)", " (radio edit)", " (edit)",
                     " (explicit)", " (clean)"] {
        if result.ends_with(suffix) {
            result = result[..result.len() - suffix.len()].to_string();
        }
    }

    // Remove "feat.", "ft.", "featuring" and everything after
    for &prefix in &[" feat. ", " ft. ", " featuring ", " vs ", " x "] {
        if let Some(idx) = result.find(prefix) {
            result = result[..idx].to_string();
        }
    }

    // Collapse whitespace
    re;

    result
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

/// Helper — strip content in parens/brackets (simple, no regex dependency).
fn regex_removed(s: &mut String) -> bool {
    let mut changed = false;
    // Remove ( ...) blocks
    while let Some(open) = s.find('(') {
        if let Some(close) = s[open..].find(')') {
            s.replace_range(open..open + close + 1, "");
            changed = true;
        } else {
            break;
        }
    }
    // Remove [ ...] blocks
    while let Some(open) = s.find('[') {
        if let Some(close) = s[open..].find(']') {
            s.replace_range(open..open + close + 1, "");
            changed = true;
        } else {
            break;
        }
    }
    changed
}

/// Simple fuzzy match: check if both title AND artist normalized contain
/// each other's words, or if they are very similar (Levenshtein-lite).
fn is_fuzzy_match(chart_title: &str, chart_artist: &str, lib_title: &str, lib_artist: &str) -> bool {
    let ct = normalize(chart_title);
    let ca = normalize(chart_artist);
    let lt = normalize(lib_title);
    let la = normalize(lib_artist);

    // Exact match after normalization
    if ct == lt && ca == la {
        return true;
    }

    // Title contains chart title (or vice versa) AND artist contains chart artist (or vice versa)
    let title_match = ct.contains(&lt) || lt.contains(&ct);
    let artist_match = ca.contains(&la) || la.contains(&ca);

    if title_match && artist_match {
        return true;
    }

    // Word-overlap heuristic: check if the majority of meaningful words match
    let title_overlap = word_overlap(&ct, &lt);
    let artist_overlap = word_overlap(&ca, &la);

    // Require at least 60% title overlap AND 60% artist overlap
    if title_overlap >= 0.6 && artist_overlap >= 0.5 {
        return true;
    }

    false
}

/// Calculate word overlap ratio (0.0 - 1.0) between two strings.
fn word_overlap(a: &str, b: &str) -> f64 {
    let words_a: HashSet<&str> = a.split_whitespace().filter(|w| w.len() > 1).collect();
    let words_b: HashSet<&str> = b.split_whitespace().filter(|w| w.len() > 1).collect();

    if words_a.is_empty() || words_b.is_empty() {
        return 0.0;
    }

    let intersection: HashSet<&&str> = words_a.intersection(&words_b).collect();
    let min_len = words_a.len().min(words_b.len());

    intersection.len() as f64 / min_len as f64
}

// ====================================================================
// Tauri Commands
// ====================================================================

/// Refresh chart data from all sources and store in SQLite.
/// Returns a summary of what was fetched.
#[tauri::command]
pub async fn viral_refresh_charts(
    app: AppHandle,
    country: Option<String>,
) -> Result<serde_json::Value, String> {
    let country = country.unwrap_or_else(|| "de".to_string());
    let country_lower = country.to_lowercase();

    println!("[ViralCharts] Starting chart refresh for country: {}", country);

    // Fetch from all sources concurrently
    let (apple_result, deezer_result, itunes_result) = tokio::join!(
        sources::fetch_apple_music_charts(&country_lower, 100, "all"),
        sources::fetch_deezer_charts(&country, 100),
        sources::fetch_itunes_top_songs(&country_lower, 50),
    );

    let mut all_entries: Vec<ChartEntry> = Vec::new();

    // Collect successful results
    match apple_result {
        Ok(entries) => {
            println!("[ViralCharts] Apple Music: {} entries", entries.len());
            all_entries.extend(entries);
        }
        Err(ref e) => println!("[ViralCharts] Apple Music failed: {}", e),
    }

    match deezer_result {
        Ok(entries) => {
            println!("[ViralCharts] Deezer: {} entries", entries.len());
            all_entries.extend(entries);
        }
        Err(ref e) => println!("[ViralCharts] Deezer failed: {}", e),
    }

    match itunes_result {
        Ok(entries) => {
            println!("[ViralCharts] iTunes: {} entries", entries.len());
            all_entries.extend(entries);
        }
        Err(ref e) => println!("[ViralCharts] iTunes failed: {}", e),
    }

    if all_entries.is_empty() {
        return Err("All chart sources failed. Please check your internet connection.".to_string());
    }

    // Deduplicate by (normalized_title, normalized_artist)
    let mut seen: HashSet<(String, String)> = HashSet::new();
    all_entries.retain(|e| {
        let key = (normalize(&e.title), normalize(&e.artist));
        seen.insert(key)
    });

    // Store in SQLite
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    // Clear old entries for this country
    conn.execute("DELETE FROM viral_hits WHERE country = ?1", [&country])
        .map_err(|e| format!("Failed to clear old viral hits: {}", e))?;

    // Insert new entries
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;

    let mut count = 0u32;
    for entry in &all_entries {
        let id = format!("viral-{}-{}-{}",
            entry.source,
            entry.country.to_lowercase(),
            count
        );

        tx.execute(
            "INSERT INTO viral_hits (id, title, artist, source, playlist_name, chart_position, country, fetched_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                id,
                entry.title,
                entry.artist,
                entry.source,
                entry.playlist_name,
                entry.chart_position,
                entry.country,
                now,
            ],
        ).map_err(|e| format!("Failed to insert viral hit: {}", e))?;
        count += 1;
    }

    tx.commit().map_err(|e| format!("Commit failed: {}", e))?;

    println!("[ViralCharts] Stored {} unique entries for country {}", count, country);

    Ok(serde_json::json!({
        "totalEntries": count,
        "country": country,
        "fetchedAt": now,
        "sources": {
            "appleMusic": apple_result.is_ok(),
            "deezer": deezer_result.is_ok(),
            "itunes": itunes_result.is_ok(),
        }
    }))
}

/// Match chart entries against the local song library and return matched song IDs.
///
/// Takes `songs_json` (array of {id, title, artist}) from the frontend and
/// performs fuzzy matching against stored chart entries. Results are cached
/// in SQLite (matched_song_id column).
#[tauri::command]
pub fn viral_match_library(
    app: AppHandle,
    songs_json: String,
) -> Result<Vec<ViralMatchResult>, String> {
    let songs: Vec<serde_json::Value> = serde_json::from_str(&songs_json)
        .map_err(|e| format!("Failed to parse songs JSON: {}", e))?;

    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Load all chart entries
    let mut stmt = conn
        .prepare(
            "SELECT id, title, artist, source, playlist_name, chart_position, country
             FROM viral_hits
             ORDER BY chart_position ASC"
        )
        .map_err(|e| format!("Failed to query viral hits: {}", e))?;

    let chart_entries: Vec<(String, String, String, String, String, i64, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?, // id
                row.get::<_, String>(1)?, // title
                row.get::<_, String>(2)?, // artist
                row.get::<_, String>(3)?, // source
                row.get::<_, String>(4)?, // playlist_name
                row.get::<_, i64>(5)?,   // chart_position
                row.get::<_, String>(6)?, // country
            ))
        })
        .map_err(|e| format!("Failed to map viral hits: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    if chart_entries.is_empty() {
        return Ok(Vec::new());
    }

    println!(
        "[ViralCharts] Matching {} chart entries against {} library songs",
        chart_entries.len(),
        songs.len()
    );

    // Match each library song against chart entries
    let mut results: Vec<ViralMatchResult> = Vec::new();
    let mut matched_ids: Vec<(String, String)> = Vec::new(); // (chart_id, song_id)

    for song in &songs {
        let song_id = song.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let song_title = song.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let song_artist = song.get("artist").and_then(|v| v.as_str()).unwrap_or("");

        if song_id.is_empty() || song_title.is_empty() {
            continue;
        }

        let mut matches: Vec<ViralMatchInfo> = Vec::new();

        for (chart_id, chart_title, chart_artist, chart_source, chart_playlist, chart_pos, chart_country) in &chart_entries {
            if is_fuzzy_match(chart_title, chart_artist, song_title, song_artist) {
                matches.push(ViralMatchInfo {
                    title: chart_title.clone(),
                    artist: chart_artist.clone(),
                    source: chart_source.clone(),
                    playlist_name: chart_playlist.clone(),
                    chart_position: *chart_pos,
                    country: chart_country.clone(),
                });
                matched_ids.push((chart_id.clone(), song_id.to_string()));
            }
        }

        if !matches.is_empty() {
            results.push(ViralMatchResult {
                song_id: song_id.to_string(),
                song_title: song_title.to_string(),
                song_artist: song_artist.to_string(),
                chart_entries: matches,
            });
        }
    }

    // Update matched_song_id in SQLite for caching
    if !matched_ids.is_empty() {
        let tx = conn.unchecked_transaction()
            .map_err(|e| format!("Transaction failed: {}", e))?;

        // Clear old matches
        tx.execute("UPDATE viral_hits SET matched_song_id = NULL", [])
            .map_err(|e| format!("Failed to clear old matches: {}", e))?;

        for (chart_id, song_id) in &matched_ids {
            tx.execute(
                "UPDATE viral_hits SET matched_song_id = ?1 WHERE id = ?2",
                rusqlite::params![song_id, chart_id],
            ).map_err(|e| format!("Failed to update match: {}", e))?;
        }

        tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
    }

    println!("[ViralCharts] Found {} matches", results.len());
    Ok(results)
}

/// Get all matched song IDs (quick lookup for the UI).
#[tauri::command]
pub fn viral_get_matched_ids(app: AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT DISTINCT matched_song_id FROM viral_hits WHERE matched_song_id IS NOT NULL")
        .map_err(|e| format!("Failed to query matched IDs: {}", e))?;

    let ids: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to map matched IDs: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

/// Get all stored chart entries.
#[tauri::command]
pub fn viral_get_entries(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, artist, source, playlist_name, chart_position, country, fetched_at, matched_song_id
             FROM viral_hits
             ORDER BY source, chart_position ASC"
        )
        .map_err(|e| format!("Failed to query viral entries: {}", e))?;

    let rows: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "artist": row.get::<_, String>(2)?,
                "source": row.get::<_, String>(3)?,
                "playlistName": row.get::<_, String>(4)?,
                "chartPosition": row.get::<_, i64>(5)?,
                "country": row.get::<_, String>(6)?,
                "fetchedAt": row.get::<_, i64>(7)?,
                "matchedSongId": row.get::<_, Option<String>>(8)?,
            }))
        })
        .map_err(|e| format!("Failed to map viral entries: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Get the current status of viral hits (last fetch, counts, etc.).
#[tauri::command]
pub fn viral_get_status(app: AppHandle) -> Result<ViralStatus, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM viral_hits", [], |r| r.get(0))
        .unwrap_or(0);

    let matched: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT matched_song_id) FROM viral_hits WHERE matched_song_id IS NOT NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let last_fetched: Option<i64> = conn
        .query_row(
            "SELECT MAX(fetched_at) FROM viral_hits",
            [],
            |r| r.get(0),
        )
        .ok();

    let country: String = conn
        .query_row(
            "SELECT COALESCE((SELECT value FROM app_settings WHERE key = 'viral_charts_country'), 'de')",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "de".to_string());

    // Get distinct sources
    let mut src_stmt = conn
        .prepare("SELECT DISTINCT source FROM viral_hits")
        .map_err(|e| format!("Failed to query sources: {}", e))?;
    let sources: Vec<String> = src_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to map sources: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ViralStatus {
        total_entries: total,
        matched_count: matched,
        last_fetched_at: last_fetched,
        sources,
        country,
    })
}

/// Clear all cached viral hits data.
#[tauri::command]
pub fn viral_clear(app: AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let count = conn
        .execute("DELETE FROM viral_hits", [])
        .map_err(|e| format!("Failed to clear viral hits: {}", e))?;

    Ok(serde_json::json!({
        "cleared": count,
        "message": format!("Cleared {} viral hit entries", count),
    }))
}

/// Set the viral charts country setting.
#[tauri::command]
pub fn viral_set_country(app: AppHandle, country: String) -> Result<serde_json::Value, String> {
    let state = app.state::<DbState>();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('viral_charts_country', ?1)",
        [&country],
    ).map_err(|e| format!("Failed to save country setting: {}", e))?;

    Ok(serde_json::json!({
        "country": country,
        "message": format!("Chart country set to {}", country),
    }))
}
