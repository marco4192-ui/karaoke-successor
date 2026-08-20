<?php
/**
 * Anti-Cheat Verification — Server-side PHP implementation.
 * Mirrors the client-side verification logic from anti-cheat-proof.ts.
 *
 * This file is included by index.php and provides functions for:
 *   1. Integrity hash re-computation and verification
 *   2. Score plausibility checks (bounds, consistency, physics)
 *   3. Proof timestamp validation
 *   4. Flagging suspicious scores (not rejected, but marked)
 */

// ============================================================
// INTEGRITY HASH
// ============================================================

/**
 * Re-compute the integrity hash from the proof package and score data.
 * Returns the expected hash (lowercase hex, 64 chars).
 */
function recomputeIntegrityHash(array $proof, array $scoreData): string {
    $fields = [
        // Scoring metadata
        $proof['total_note_ticks'],
        $proof['golden_note_ticks'],
        $proof['normal_note_ticks'],
        $proof['points_per_tick'],
        $proof['combo_multiplier'],
        $proof['total_notes'],
        $proof['max_possible_score'],
        // Chain
        $proof['chain_root'],
        $proof['chain_length'],
        // Timing
        $proof['proof_ts'],
        // Game result
        $scoreData['score'],
        $scoreData['accuracy'],
        $scoreData['max_combo'],
        $scoreData['notes_hit'],
        $scoreData['notes_missed'],
        $scoreData['difficulty'],
        // Fingerprint version
        $proof['fingerprint_version'] ?? 'v1',
    ];
    return hash('sha256', implode('|', $fields));
}

/**
 * Verify the integrity hash matches (constant-time comparison).
 */
function verifyIntegrityHash(array $proof, array $scoreData): bool {
    $expected = recomputeIntegrityHash($proof, $scoreData);
    $actual = $proof['integrity_hash'] ?? '';
    return hash_equals($expected, $actual);
}

// ============================================================
// PROOF TIMESTAMP
// ============================================================

/**
 * Verify the proof timestamp is within the acceptable window.
 * Default: 5 minutes (300 seconds). Max allowed: 1 hour (3600 seconds).
 */
function verifyProofTimestamp(array $proof, int $maxAgeSeconds = 300): bool {
    $ts = (int)($proof['proof_ts'] ?? 0);
    if ($ts <= 0) return false;
    $now = time();
    $age = $now - $ts;
    return $age >= 0 && $age <= min($maxAgeSeconds, 3600);
}

// ============================================================
// SCORE PLAUSIBILITY CHECKS
// ============================================================

/**
 * Run all server-side plausibility checks on a score submission.
 * Returns ['valid' => true] or ['valid' => false, 'reason' => string].
 *
 * These checks mirror verifyScorePlausibility() in anti-cheat-proof.ts.
 */
function verifyScorePlausibility(
    int $score,
    int $maxScore,
    float $accuracy,
    int $maxCombo,
    int $notesHit,
    int $notesMissed,
    array $proof
): array {
    // 1. Score bounds check
    if ($score < 0 || $score > 10000) {
        return ['valid' => false, 'reason' => 'score_out_of_range'];
    }
    if ($maxScore !== 10000) {
        return ['valid' => false, 'reason' => 'invalid_max_score'];
    }

    // 2. Accuracy bounds
    if ($accuracy < 0 || $accuracy > 100) {
        return ['valid' => false, 'reason' => 'accuracy_out_of_range'];
    }

    // 3. Notes consistency
    $totalNotesClaimed = $notesHit + $notesMissed;
    if ($totalNotesClaimed <= 0) {
        return ['valid' => false, 'reason' => 'no_notes_claimed'];
    }
    $proofTotalNotes = (int)($proof['total_notes'] ?? 0);
    if ($proofTotalNotes > 0 && $totalNotesClaimed > (int)($proofTotalNotes * 1.05)) {
        return ['valid' => false, 'reason' => 'too_many_notes_claimed'];
    }

    // 4. Max combo cannot exceed total note ticks
    $totalTicks = (int)($proof['total_note_ticks'] ?? 0);
    if ($maxCombo > $totalTicks && $totalTicks > 0) {
        return ['valid' => false, 'reason' => 'combo_exceeds_ticks'];
    }
    if ($maxCombo > $notesHit) {
        return ['valid' => false, 'reason' => 'combo_exceeds_hits'];
    }

    // 5. Chain length consistency
    $chainLength = (int)($proof['chain_length'] ?? 0);
    if ($chainLength > 0 && $proofTotalNotes > 0) {
        if ($chainLength > (int)($proofTotalNotes * 1.2)) {
            return ['valid' => false, 'reason' => 'chain_too_long'];
        }
    }

    // 6. Scoring metadata consistency
    $goldenTicks = (int)($proof['golden_note_ticks'] ?? 0);
    $normalTicks = (int)($proof['normal_note_ticks'] ?? 0);
    if ($totalTicks > 0 && $goldenTicks + $normalTicks !== $totalTicks) {
        return ['valid' => false, 'reason' => 'tick_count_mismatch'];
    }

    // 7. Points per tick plausibility
    $ppt = (float)($proof['points_per_tick'] ?? 0);
    if ($ppt <= 0 || $ppt > 100) {
        return ['valid' => false, 'reason' => 'invalid_points_per_tick'];
    }

    // 8. High score with no hits is suspicious
    if ($notesHit === 0 && $score > $proofTotalNotes * 5) {
        return ['valid' => false, 'reason' => 'high_score_no_hits'];
    }

    // 9. Estimated max score verification (with tolerance)
    // For a perfect game: score should be ~10000.
    // For a 50% hit rate, score should be significantly lower.
    // This is a SOFT check — we flag but don't reject.
    // (Handled by flagSuspiciousScore, not here)

    return ['valid' => true];
}

// ============================================================
// SUSPICIOUS SCORE DETECTION (SOFT FLAGS)
// ============================================================

/**
 * Flag suspicious scores — these are NOT rejected but stored with a flag.
 * The UI can choose to display them differently (e.g., with a warning icon).
 *
 * Returns an array of flag strings (empty = no flags).
 */
function flagSuspiciousScore(
    int $score,
    float $accuracy,
    int $maxCombo,
    int $notesHit,
    int $notesMissed,
    array $proof
): array {
    $flags = [];
    $totalNotesClaimed = $notesHit + $notesMissed;

    // Flag 1: Score seems too high for the accuracy claimed
    // With 50% accuracy, you shouldn't get more than ~5000 points
    // (very rough heuristic — combo bonuses make this imprecise)
    if ($accuracy < 50 && $score > 6000) {
        $flags[] = 'score_accuracy_mismatch';
    }

    // Flag 2: Near-perfect score but low combo
    // A score > 9500 should typically have a very high max combo
    $totalTicks = (int)($proof['total_note_ticks'] ?? 0);
    if ($score > 9500 && $totalTicks > 50) {
        $comboRatio = $maxCombo / $totalTicks;
        if ($comboRatio < 0.5) {
            $flags[] = 'low_combo_high_score';
        }
    }

    // Flag 3: All notes hit (no misses) but very low accuracy
    // If you hit every note, accuracy should be reasonable
    if ($notesMissed === 0 && $notesHit > 10 && $accuracy < 20) {
        $flags[] = 'all_hit_low_accuracy';
    }

    // Flag 4: Score too consistent with existing top scores
    // (Checked separately after DB lookup — not here)

    // Flag 5: Proof timestamp too old but still within max window
    $proofAge = time() - (int)($proof['proof_ts'] ?? 0);
    if ($proofAge > 120) { // older than 2 minutes is slightly suspicious
        $flags[] = 'stale_proof';
    }

    return $flags;
}

// ============================================================
// SCORE ESTIMATION (SERVER-SIDE RE-COMPUTATION)
// ============================================================

/**
 * Estimate the maximum possible score for given scoring parameters.
 * This uses the same normalization formula as the client's calculateScoringMetadata().
 *
 * Scoring constants (mirrored from scoring.ts):
 *   MAX_POINTS_PER_SONG = 10000
 *   PERFECT_NOTE_MULTIPLIER = 2
 *   PERFECT_GOLDEN_MULTIPLIER = 10
 *   COMPLETION_BONUS_RATIO = 0.15
 *   COMBO_RAMP_TICKS = 50
 */
function estimateMaxPossibleScore(
    int $totalNoteTicks,
    int $goldenNoteTicks,
    float $comboMultiplier
): float {
    if ($totalNoteTicks <= 0) return 10000.0;

    $normalNoteTicks = $totalNoteTicks - $goldenNoteTicks;
    $baseWeight = ($normalNoteTicks * 2) + ($goldenNoteTicks * 10);
    $completionBonusPool = $baseWeight * 0.15;
    $rampTicks = 50;

    // Combo normalization factor
    if ($totalNoteTicks <= $rampTicks) {
        $comboNormFactor = 1 + ($comboMultiplier - 1) * ($totalNoteTicks + 1) / (2 * $rampTicks);
    } else {
        $rampSum = $rampTicks + ($comboMultiplier - 1) * $rampTicks * ($rampTicks + 1) / (2 * $rampTicks);
        $fullSum = ($totalNoteTicks - $rampTicks) * $comboMultiplier;
        $comboNormFactor = ($rampSum + $fullSum) / $totalNoteTicks;
    }

    $perfectScoreBase = $baseWeight * $comboNormFactor;
    $pointsPerTick = ($perfectScoreBase + $completionBonusPool) > 0
        ? 10000 / ($perfectScoreBase + $completionBonusPool)
        : 1;

    return $pointsPerTick;
}

/**
 * Validate that the submitted points_per_tick matches what the server computes.
 * Allows 1% tolerance for floating point differences.
 */
function verifyPointsPerTick(array $proof, float $comboMultiplier): bool {
    $totalTicks = (int)($proof['total_note_ticks'] ?? 0);
    $goldenTicks = (int)($proof['golden_note_ticks'] ?? 0);
    $submitted = (float)($proof['points_per_tick'] ?? 0);

    if ($submitted <= 0) return false;

    $expected = estimateMaxPossibleScore($totalTicks, $goldenTicks, $comboMultiplier);
    $diff = abs($submitted - $expected);
    $tolerance = $expected * 0.01; // 1% tolerance

    return $diff <= max($tolerance, 0.001);
}
