//! HTTP fetching for chart data sources.
//!
//! Each function returns a list of `ChartEntry` structs. All HTTP calls are
//! synchronous (the caller is expected to run them on a blocking thread).

use std::sync::LazyLock;

use serde::Deserialize;

/// Shared HTTP client with connection pooling, reused across all chart fetches.
static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("Failed to build shared HTTP client")
});

/// A single chart entry fetched from an external source.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ChartEntry {
    pub title: String,
    pub artist: String,
    pub source: String,       // "apple_music" | "deezer"
    pub playlist_name: String,
    pub chart_position: i64,
    pub country: String,
}

// ---------------------------------------------------------------------------
// Apple Music RSS Charts
// ---------------------------------------------------------------------------

/// Apple Music RSS uses JSON feeds. URLs look like:
/// https://rss.applemarketingtools.com/api/v2/{country}/music/most-played/{count}/songs.json
///
/// No authentication required.
const APPLE_MUSIC_BASE: &str = "https://rss.applemarketingtools.com/api/v2";

#[derive(Deserialize)]
struct AppleMusicResponse {
    feed: AppleMusicFeed,
}

#[derive(Deserialize)]
struct AppleMusicFeed {
    results: Vec<AppleMusicSong>,
}

#[derive(Deserialize)]
struct AppleMusicSong {
    #[serde(rename = "artistName")]
    artist_name: String,
    #[serde(rename = "name")]
    song_name: String,
    #[serde(rename = "chartPosition")]
    chart_position: i64,
}

/// Fetch top songs from Apple Music RSS for a given country code.
///
/// `country` – ISO 3166-1 alpha-2 code (e.g. "de", "us", "gb", "at", "ch").
/// `count` – number of results (max 200).
/// `genre` – chart genre: "all" for overall, or specific like "pop", "hip-hop", etc.
pub async fn fetch_apple_music_charts(
    country: &str,
    count: u32,
    genre: &str,
) -> Result<Vec<ChartEntry>, String> {
    let genre_path = if genre == "all" { "most-played" } else { genre };
    let url = format!(
        "{}/{}/music/{}/{}.json",
        APPLE_MUSIC_BASE, country, genre_path, count
    );

    let resp = HTTP_CLIENT
        .get(&url)
        .header("User-Agent", "KaraokeSuccessor/1.0")
        .send()
        .await
        .map_err(|e| format!("Apple Music request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Apple Music returned status {} for {}",
            resp.status(),
            url
        ));
    }

    let data: AppleMusicResponse = resp
        .json()
        .await
        .map_err(|e| format!("Apple Music JSON parse failed: {}", e))?;

    let playlist_name = format!("Apple Music Top {} ({})", count, country.to_uppercase());
    let entries: Vec<ChartEntry> = data
        .feed
        .results
        .into_iter()
        .map(|s| ChartEntry {
            title: s.song_name,
            artist: s.artist_name,
            source: "apple_music".to_string(),
            playlist_name: playlist_name.clone(),
            chart_position: s.chart_position,
            country: country.to_string(),
        })
        .collect();

    Ok(entries)
}

// ---------------------------------------------------------------------------
// Deezer Chart API
// ---------------------------------------------------------------------------

/// Deezer provides a free JSON API for charts. No authentication required.
/// URL: https://api.deezer.com/chart/{id}  or  /chart/{id}/tracks?limit=N
///
/// Common chart IDs:
/// 0   – World / Global
/// 1   – France
/// 2   – Italy
/// 3   – Germany (DE is not an ID but we can use country codes)
/// etc.
///
/// We use the "ranking" endpoint which accepts country ISO codes:
/// https://api.deezer.com/chart/{country}/tracks?limit=N
const DEEZER_BASE: &str = "https://api.deezer.com";

#[derive(Deserialize)]
struct DeezerChartResponse {
    data: Option<Vec<DeezerTrack>>,
    error: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct DeezerTrack {
    title: String,
    artist: DeezerArtist,
    rank: Option<i64>,
}

#[derive(Deserialize)]
struct DeezerArtist {
    name: String,
}

/// Fetch top tracks from Deezer for a given country code.
///
/// `country` – ISO 3166-1 alpha-2 code (e.g. "DE", "US", "GB", "AT", "CH").
/// `limit` – number of results (max 100 for Deezer).
pub async fn fetch_deezer_charts(
    country: &str,
    limit: u32,
) -> Result<Vec<ChartEntry>, String> {
    // Deezer uses uppercase country codes
    let country_upper = country.to_uppercase();
    let url = format!(
        "{}/chart/{}/tracks?limit={}",
        DEEZER_BASE, country_upper, limit
    );

    let resp = HTTP_CLIENT
        .get(&url)
        .header("User-Agent", "KaraokeSuccessor/1.0")
        .send()
        .await
        .map_err(|e| format!("Deezer request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Deezer returned status {} for {}",
            resp.status(),
            url
        ));
    }

    let data: DeezerChartResponse = resp
        .json()
        .await
        .map_err(|e| format!("Deezer JSON parse failed: {}", e))?;

    // Deezer sometimes returns {"error": ...}
    if let Some(err) = data.error {
        return Err(format!("Deezer API error: {:?}", err));
    }

    let tracks = data.data.unwrap_or_default();
    let playlist_name = format!("Deezer Top {} ({})", limit, country_upper);

    let entries: Vec<ChartEntry> = tracks
        .into_iter()
        .enumerate()
        .map(|(i, t)| ChartEntry {
            title: t.title,
            artist: t.artist.name,
            source: "deezer".to_string(),
            playlist_name: playlist_name.clone(),
            chart_position: t.rank.unwrap_or((i + 1) as i64),
            country: country_upper.clone(),
        })
        .collect();

    Ok(entries)
}

// ---------------------------------------------------------------------------
// Fallback: iTunes Search (for additional coverage)
// ---------------------------------------------------------------------------

const ITUNES_BASE: &str = "https://itunes.apple.com";

#[derive(Deserialize)]
struct ITunesResponse {
    results: Vec<ITunesTrack>,
}

#[derive(Deserialize)]
struct ITunesTrack {
    #[serde(rename = "trackName")]
    track_name: String,
    #[serde(rename = "artistName")]
    artist_name: String,
}

/// Fetch top results from iTunes Search for a country.
///
/// Uses the iTunes Search API (no auth required).
pub async fn fetch_itunes_top_songs(
    country: &str,
    limit: u32,
) -> Result<Vec<ChartEntry>, String> {
    let url = format!(
        "{}/search?term=top+songs&country={}&media=music&entity=song&limit={}",
        ITUNES_BASE, country, limit
    );

    let resp = HTTP_CLIENT
        .get(&url)
        .header("User-Agent", "KaraokeSuccessor/1.0")
        .send()
        .await
        .map_err(|e| format!("iTunes request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "iTunes returned status {} for {}",
            resp.status(),
            url
        ));
    }

    let data: ITunesResponse = resp
        .json()
        .await
        .map_err(|e| format!("iTunes JSON parse failed: {}", e))?;

    let playlist_name = format!("iTunes Top Songs ({})", country.to_uppercase());
    let entries: Vec<ChartEntry> = data
        .results
        .into_iter()
        .enumerate()
        .map(|(i, t)| ChartEntry {
            title: t.track_name,
            artist: t.artist_name,
            source: "itunes".to_string(),
            playlist_name: playlist_name.clone(),
            chart_position: (i + 1) as i64,
            country: country.to_string(),
        })
        .collect();

    Ok(entries)
}
