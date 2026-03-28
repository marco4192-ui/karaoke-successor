# Karaoke Leaderboard API

A simple PHP/MySQL API for the Karaoke Successor leaderboard system.

## Installation on Shared Hosting (netcup)

### 1. Create Database

1. Log into your hosting control panel (Plesk, cPanel, etc.)
2. Create a new MySQL database named `karaoke_leaderboard`
3. Create a database user and grant all privileges
4. Import the schema: `schema.sql` via phpMyAdmin

### 2. Upload Files

Upload the contents of this folder to your web server:
```
your-domain.com/leaderboard-api/
├── config.php
├── index.php
├── .htaccess
└── schema.sql (optional - can be deleted after setup)
```

### 3. Configure

Edit `config.php` and update:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'karaoke_leaderboard');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
```

### 4. Test

Visit `https://your-domain.com/leaderboard-api/` to see API info.

## API Endpoints

### Players

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/players` | List all players |
| GET | `/players/{id}` | Get player details with top songs |
| POST | `/players` | Create or update player |
| PUT | `/players/{id}` | Update player privacy settings |

**Example - Create Player:**
```json
POST /players
{
    "id": "player-123",
    "name": "RockStar",
    "country": "DE",
    "color": "#FF6B6B",
    "avatar_url": "https://..."
}
```

**Example - Update Privacy:**
```json
PUT /players/player-123
{
    "show_on_leaderboard": 1,
    "show_photo": 0,
    "show_country": 1
}
```

### Scores

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scores` | List scores (filterable) |
| POST | `/scores` | Submit new score |

**Example - Submit Score:**
```json
POST /scores
{
    "player_id": "player-123",
    "song_id": "song-456",
    "song_title": "Bohemian Rhapsody",
    "song_artist": "Queen",
    "score": 95000,
    "accuracy": 92.5,
    "max_combo": 45,
    "difficulty": "hard",
    "game_mode": "standard",
    "rating": "excellent",
    "notes_hit": 180,
    "notes_missed": 15,
    "duration": 354000
}
```

### Leaderboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard/global` | Global top players |
| GET | `/leaderboard/song/{id}` | Song-specific leaderboard |
| GET | `/leaderboard/recent` | Recent scores |

### Songs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/songs` | List all songs |
| GET | `/songs/{id}` | Get song stats |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=query` | Search players and songs |

## Privacy Settings

Players can control their visibility:

| Setting | Description |
|---------|-------------|
| `show_on_leaderboard` | Appear on public leaderboards (0/1) |
| `show_photo` | Show profile photo on leaderboard (0/1) |
| `show_country` | Show country flag on leaderboard (0/1) |

## Integration with Next.js App

Update your app configuration:
```typescript
const API_BASE = 'https://your-domain.com/leaderboard-api';

// Submit score
fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scoreData)
});

// Get leaderboard
const response = await fetch(`${API_BASE}/leaderboard/global`);
const { leaderboard } = await response.json();
```

## Cloud Sync Integration

The PHP backend serves as the cloud endpoint for the Prisma/PostgreSQL sync system.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri App (Your PC)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Prisma + PostgreSQL (Local)             │   │
│  │   - User accounts & sessions                         │   │
│  │   - Player profiles & settings                       │   │
│  │   - Local scores & achievements                      │   │
│  │   - Offline-first sync queue                         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                    Cloud Sync API                            │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 PHP Backend (Shared Hosting)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  MySQL Database                      │   │
│  │   - Global leaderboard aggregation                   │   │
│  │   - Cross-device score sync                          │   │
│  │   - Public player profiles                           │   │
│  │   - Song statistics                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Required PHP Extensions

Ensure your hosting has these extensions enabled:
- `pdo_mysql` - Database connectivity
- `json` - JSON encoding/decoding
- `curl` - Optional, for webhook notifications

### Sync Flow

1. **Push** - Local scores → Cloud
   - App sends unsynced scores to `/scores`
   - Player profile updated via `/players`
   - Cloud returns confirmation with cloud IDs

2. **Pull** - Cloud → Local
   - App fetches `/players/{id}` for aggregated stats
   - `/leaderboard/global` for comparison
   - Stats merged with local data

### New Endpoints for Cloud Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/players/{id}/stats` | Get aggregated player stats |
| POST | `/sync/batch` | Batch sync multiple scores |
| GET | `/sync/changes/{timestamp}` | Get changes since timestamp |

## Authentication (Optional Extension)

For enhanced security, you can add API key authentication:

### 1. Add API Keys Table

```sql
CREATE TABLE `karaoke_api_keys` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `player_id` VARCHAR(32) NOT NULL,
    `api_key` VARCHAR(64) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `last_used` DATETIME,
    `is_active` TINYINT(1) DEFAULT 1,
    
    UNIQUE KEY `unique_key` (`api_key`),
    FOREIGN KEY (`player_id`) REFERENCES `karaoke_players`(`id`)
);
```

### 2. Add Authentication Middleware

In `config.php`, add:
```php
function validateApiKey($key) {
    // Validate API key from header
    // Return player_id or false
}

// In router, check for X-API-Key header on POST/PUT
```

## Security Notes

1. The API uses CORS headers for cross-origin requests
2. Rate limiting is built-in (100 requests/minute per IP)
3. All input is sanitized
4. Prepared statements prevent SQL injection
5. Consider adding API key authentication for write operations
6. **HTTPS is strongly recommended** for production
7. Set `display_errors = 0` in production php.ini

## Troubleshooting

### 500 Internal Server Error
- Check database credentials in `config.php`
- Ensure MySQL extension is enabled
- Check error logs in hosting panel

### CORS Errors
- Ensure `ENABLE_CORS` is set to `true` in `config.php`
- Check that `.htaccess` is uploaded correctly

### Mod Rewrite Not Working
- Ensure Apache `mod_rewrite` is enabled
- Check if `.htaccess` is allowed by your hosting provider
