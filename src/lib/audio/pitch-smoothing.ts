/**
 * Pitch stability / smoothing logic.
 *
 * Maintains a sliding window of recent pitch values and only reports a
 * "stable" pitch when the last N frames are within one semitone of each
 * other.  This prevents jittery output from causing rapid note changes.
 */

export class PitchStabilizer {
  private recentPitches: number[] = [];
  private lastStablePitch: number | null = null;
  private stabilityFrames: number;

  constructor(stabilityFrames: number = 3) {
    this.stabilityFrames = stabilityFrames;
  }

  /** Update the required number of consecutive stable frames. */
  setStabilityFrames(frames: number): void {
    this.stabilityFrames = frames;
  }

  /**
   * Feed a new pitch (in MIDI note units) and get the smoothed result.
   * Returns `null` while accumulating enough frames; once stable, returns
   * the rounded average.  If stability is lost, returns the *previous*
   * stable pitch (if any) so the output never flickers.
   */
  process(currentPitch: number): number | null {
    this.recentPitches.push(currentPitch);

    // Keep only required number of frames
    if (this.recentPitches.length > this.stabilityFrames) {
      this.recentPitches.shift();
    }

    // Not enough frames yet
    if (this.recentPitches.length < this.stabilityFrames) {
      return this.lastStablePitch;
    }

    // Check if all recent pitches are within 1 semitone
    const avgPitch = this.recentPitches.reduce((a, b) => a + b, 0) / this.recentPitches.length;
    const maxDiff = Math.max(...this.recentPitches.map(p => Math.abs(p - avgPitch)));

    if (maxDiff <= 1) {
      this.lastStablePitch = Math.round(avgPitch * 10) / 10; // Round to 0.1 semitone
      return this.lastStablePitch;
    }

    return this.lastStablePitch;
  }

  /** Clear all history — e.g. when a gap in pitch is detected. */
  reset(): void {
    this.recentPitches = [];
    this.lastStablePitch = null;
  }
}
