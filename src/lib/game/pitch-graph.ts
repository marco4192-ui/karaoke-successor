// Real-time Pitch Graph - Shows singer's pitch curve vs target notes
interface PitchGraphPoint {
  time: number;
  pitch: number | null;
  isTarget: boolean;
  accuracy?: number; // 0-1, how close to target
}

export interface PitchGraphConfig {
  width: number;
  height: number;
  timeWindow: number; // ms of history to show
  minPitch: number; // MIDI note
  maxPitch: number; // MIDI note
  showTargetLine: boolean;
  showHistory: boolean;
  colorScheme: 'default' | 'neon' | 'retro';
}

export const DEFAULT_PITCH_GRAPH_CONFIG: PitchGraphConfig = {
  width: 400,
  height: 150,
  timeWindow: 10000, // 10 seconds
  minPitch: 48, // C3
  maxPitch: 72, // C5
  showTargetLine: true,
  showHistory: true,
  colorScheme: 'neon',
};

export class PitchGraphRenderer {
  private config: PitchGraphConfig;
  private history: PitchGraphPoint[] = [];
  private targetSegments: Array<{ pitch: number; startTime: number; endTime: number }> = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config: Partial<PitchGraphConfig> = {}) {
    this.config = { ...DEFAULT_PITCH_GRAPH_CONFIG, ...config };
  }

  attachCanvas(canvas: HTMLCanvasElement, skipResize?: boolean): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!skipResize) {
      canvas.width = this.config.width;
      canvas.height = this.config.height;
    }
  }

  addPoint(pitch: number | null, time: number, isTarget: boolean, accuracy?: number): void {
    this.history.push({ time, pitch, isTarget, accuracy });
    
    // Remove old points outside time window — use findIndex+slice since history is time-ordered
    const cutoff = time - this.config.timeWindow;
    const cutoffIdx = this.history.findIndex(p => p.time >= cutoff);
    if (cutoffIdx > 0) {
      this.history = this.history.slice(cutoffIdx);
    }
  }

  addTargetNote(pitch: number, startTime: number, duration: number): void {
    // Store as a segment — rendered as a continuous line during render,
    // avoiding thousands of individual points in the history array
    this.targetSegments.push({ pitch, startTime, endTime: startTime + duration });
  }

  render(currentTime: number): void {
    if (!this.ctx || !this.canvas) return;
    
    const { width, height, minPitch, maxPitch, timeWindow, showTargetLine, showHistory, colorScheme } = this.config;
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background grid
    this.drawGrid(ctx, width, height, minPitch, maxPitch);
    
    // Calculate time range
    const endTime = currentTime;
    const startTime = endTime - timeWindow;
    
    // Draw target notes (background) — render as line segments instead of individual points
    if (showHistory && showTargetLine) {
      ctx.globalAlpha = 0.3;
      const visibleTargets = this.targetSegments.filter(
        s => s.endTime >= startTime && s.startTime <= endTime
      );
      if (visibleTargets.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        let started = false;
        for (const seg of visibleTargets) {
          const x1 = this.timeToX(Math.max(seg.startTime, startTime), startTime, endTime, width);
          const y1 = this.pitchToY(seg.pitch, minPitch, maxPitch, height);
          const x2 = this.timeToX(Math.min(seg.endTime, endTime), startTime, endTime, width);
          const y2 = this.pitchToY(seg.pitch, minPitch, maxPitch, height);
          // Connect adjacent segments at same pitch
          if (!started) {
            ctx.moveTo(x1, y1);
            started = true;
          } else {
            ctx.lineTo(x1, y1);
          }
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    
    // Draw user's pitch history (history now only contains non-target points)
    if (this.history.length > 1) {
      // Color based on accuracy
      for (let i = 1; i < this.history.length; i++) {
        const prev = this.history[i - 1];
        const curr = this.history[i];
        
        if (prev.pitch === null || curr.pitch === null) continue;
        
        const color = this.getAccuracyColor(curr.accuracy, colorScheme);
        const x1 = this.timeToX(prev.time, startTime, endTime, width);
        const y1 = this.pitchToY(prev.pitch, minPitch, maxPitch, height);
        const x2 = this.timeToX(curr.time, startTime, endTime, width);
        const y2 = this.pitchToY(curr.pitch, minPitch, maxPitch, height);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    
    // Draw current pitch indicator
    const lastPoint = this.history[this.history.length - 1];
    if (lastPoint && lastPoint.pitch !== null) {
      const x = this.timeToX(lastPoint.time, startTime, endTime, width);
      const y = this.pitchToY(lastPoint.pitch, minPitch, maxPitch, height);
      
      ctx.beginPath();
      ctx.fillStyle = this.getAccuracyColor(lastPoint.accuracy, colorScheme);
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, minPitch: number, maxPitch: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal lines (pitch levels)
    const pitchRange = maxPitch - minPitch;
    for (let i = 0; i <= pitchRange; i++) {
      if (i % 12 === 0) { // Draw octave lines
        const y = this.pitchToY(minPitch + i, minPitch, maxPitch, height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Vertical lines (time)
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  private timeToX(time: number, startTime: number, endTime: number, width: number): number {
    if (endTime === startTime) return 0;
    return ((time - startTime) / (endTime - startTime)) * width;
  }

  private pitchToY(pitch: number, minPitch: number, maxPitch: number, height: number): number {
    if (maxPitch === minPitch) return height / 2;
    return height - ((pitch - minPitch) / (maxPitch - minPitch)) * height;
  }

  private getAccuracyColor(accuracy: number | undefined, scheme: PitchGraphConfig['colorScheme']): string {
    if (accuracy === undefined) return '#00ffff';
    
    switch (scheme) {
      case 'neon':
        if (accuracy > 0.9) return '#00ff88';
        if (accuracy > 0.7) return '#00ffff';
        if (accuracy > 0.5) return '#ffff00';
        return '#ff4444';
      case 'retro':
        if (accuracy > 0.9) return '#39ff14';
        if (accuracy > 0.7) return '#00ff00';
        if (accuracy > 0.5) return '#ffff00';
        return '#ff0000';
      default:
        if (accuracy > 0.9) return '#22c55e';
        if (accuracy > 0.7) return '#3b82f6';
        if (accuracy > 0.5) return '#eab308';
        return '#ef4444';
    }
  }

  clear(): void {
    this.history = [];
    this.targetSegments = [];
  }

  destroy(): void {
    this.history = [];
    this.targetSegments = [];
    this.canvas = null;
    this.ctx = null;
  }
}
