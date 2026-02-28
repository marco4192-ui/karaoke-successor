// Real-time Pitch Graph - Shows singer's pitch curve vs target notes
export interface PitchGraphPoint {
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
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config: Partial<PitchGraphConfig> = {}) {
    this.config = { ...DEFAULT_PITCH_GRAPH_CONFIG, ...config };
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = this.config.width;
    canvas.height = this.config.height;
  }

  addPoint(pitch: number | null, time: number, isTarget: boolean, accuracy?: number): void {
    this.history.push({ time, pitch, isTarget, accuracy });
    
    // Remove old points outside time window
    const cutoff = time - this.config.timeWindow;
    this.history = this.history.filter(p => p.time >= cutoff);
  }

  addTargetNote(pitch: number, startTime: number, duration: number): void {
    // Add target line segment
    for (let t = startTime; t <= startTime + duration; t += 50) {
      this.addPoint(pitch, t, true);
    }
  }

  render(currentTime: number): void {
    if (!this.ctx || !this.canvas) return;
    
    const { width, height, minPitch, maxPitch, timeWindow, showHistory, colorScheme } = this.config;
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background grid
    this.drawGrid(ctx, width, height, minPitch, maxPitch);
    
    // Calculate time range
    const endTime = currentTime;
    const startTime = endTime - timeWindow;
    
    // Draw target notes (background)
    if (showHistory) {
      ctx.globalAlpha = 0.3;
      this.drawPitchLine(ctx, this.history.filter(p => p.isTarget), startTime, endTime, minPitch, maxPitch, '#ffffff', 2);
      ctx.globalAlpha = 1;
    }
    
    // Draw user's pitch history
    const userPoints = this.history.filter(p => !p.isTarget);
    if (userPoints.length > 1) {
      // Color based on accuracy
      for (let i = 1; i < userPoints.length; i++) {
        const prev = userPoints[i - 1];
        const curr = userPoints[i];
        
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
    const lastPoint = userPoints[userPoints.length - 1];
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

  private drawPitchLine(
    ctx: CanvasRenderingContext2D,
    points: PitchGraphPoint[],
    startTime: number,
    endTime: number,
    minPitch: number,
    maxPitch: number,
    color: string,
    lineWidth: number
  ): void {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    let started = false;
    for (const point of points) {
      if (point.pitch === null) continue;
      if (point.time < startTime || point.time > endTime) continue;
      
      const x = this.timeToX(point.time, startTime, endTime, this.config.width);
      const y = this.pitchToY(point.pitch, minPitch, maxPitch, this.config.height);
      
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  private timeToX(time: number, startTime: number, endTime: number, width: number): number {
    return ((time - startTime) / (endTime - startTime)) * width;
  }

  private pitchToY(pitch: number, minPitch: number, maxPitch: number, height: number): number {
    return height - ((pitch - minPitch) / (maxPitch - minPitch)) * height;
  }

  private getAccuracyColor(accuracy: number | undefined, scheme: string): string {
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
  }

  destroy(): void {
    this.history = [];
    this.canvas = null;
    this.ctx = null;
  }
}
