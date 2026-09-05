<?php
/**
 * Local secrets for the leaderboard API — NOT committed to git.
 *
 * Copy this file to `config.local.php`, fill in real values, and upload it
 * to the web server next to config.php. Rotate values immediately if they
 * were ever exposed (e.g. previously committed to this repo).
 *
 * Alternatively use environment variables KS_DB_HOST / KS_DB_NAME /
 * KS_DB_USER / KS_DB_PASS / KS_API_SECRET — they take precedence.
 */

define('DB_PASS', 'CHANGE_ME');
define('API_SECRET', 'CHANGE_ME_LONG_RANDOM_STRING');
