'use client';

// ===================== COMBO FIRE EFFECT =====================

interface ComboFireEffectProps {
  combo: number;
  isLarge?: boolean;
}

export function ComboFireEffect({ combo, isLarge = false }: ComboFireEffectProps) {
  const intensity = Math.min(combo / 20, 1);
  const size = isLarge ? 200 : 100;

  if (combo < 5) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, 
          rgba(255, 100, 50, ${intensity * 0.3}) 0%, 
          rgba(255, 50, 0, ${intensity * 0.2}) 30%, 
          transparent 70%)`,
        filter: `blur(${10 + intensity * 20}px)`,
        animation: 'pulse 0.5s ease-in-out infinite',
      }}
    />
  );
}

// ===================== STAR POWER VISUAL EFFECT =====================

interface StarPowerEffectProps {
  isActive: boolean;
  charge: number; // 0-100
}

export function StarPowerEffect({ isActive, charge }: StarPowerEffectProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Screen flash */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-orange-500/5 to-transparent"
        style={{ animation: 'pulse 1s ease-in-out infinite' }}
      />
      
      {/* Sparkle overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(255, 200, 0, 0.1) 50%, transparent 100%)',
          animation: 'spin 3s linear infinite',
        }}
      />
      
      {/* Corner flares */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
        <div
          key={corner}
          className="absolute w-32 h-32"
          style={{
            [corner.includes('top') ? 'top' : 'bottom']: -20,
            [corner.includes('left') ? 'left' : 'right']: -20,
            background: 'radial-gradient(circle, rgba(255, 200, 0, 0.4) 0%, transparent 70%)',
            animation: 'pulse 0.5s ease-in-out infinite',
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
