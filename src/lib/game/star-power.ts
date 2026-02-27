// Star Power System - Activate for 2x points and special effects
export interface StarPowerState {
  meter: number; // 0-100
  isActive: boolean;
  duration: number; // How long it lasts in ms
  remainingTime: number; // Remaining active time
  multiplier: number;
  cooldown: boolean;
}

export const STAR_POWER_CONFIG = {
  maxMeter: 100,
  activationThreshold: 50, // Minimum meter to activate
  duration: 10000, // 10 seconds
  multiplier: 2.0,
  goldenNoteCharge: 25, // Charge from golden notes
  perfectCharge: 5, // Charge from perfect hits
  goodCharge: 2, // Charge from good hits
  comboBonus: 0.5, // Extra charge per combo level
  drainRate: 10, // Meter drained per second when active
};

export function createStarPowerState(): StarPowerState {
  return {
    meter: 0,
    isActive: false,
    duration: STAR_POWER_CONFIG.duration,
    remainingTime: 0,
    multiplier: 1.0,
    cooldown: false,
  };
}

export function chargeStarPower(
  state: StarPowerState,
  amount: number
): StarPowerState {
  if (state.isActive) return state;
  
  const newMeter = Math.min(
    STAR_POWER_CONFIG.maxMeter,
    state.meter + amount
  );
  
  return {
    ...state,
    meter: newMeter,
  };
}

export function canActivateStarPower(state: StarPowerState): boolean {
  return (
    !state.isActive &&
    !state.cooldown &&
    state.meter >= STAR_POWER_CONFIG.activationThreshold
  );
}

export function activateStarPower(state: StarPowerState): StarPowerState {
  if (!canActivateStarPower(state)) return state;
  
  return {
    ...state,
    isActive: true,
    remainingTime: STAR_POWER_CONFIG.duration,
    multiplier: STAR_POWER_CONFIG.multiplier,
  };
}

export function deactivateStarPower(state: StarPowerState): StarPowerState {
  return {
    ...state,
    isActive: false,
    remainingTime: 0,
    multiplier: 1.0,
    meter: 0, // Reset meter after use
    cooldown: true,
  };
}

export function updateStarPower(
  state: StarPowerState,
  deltaTime: number
): StarPowerState {
  if (!state.isActive) {
    // Clear cooldown after a short time
    if (state.cooldown) {
      return { ...state, cooldown: false };
    }
    return state;
  }
  
  const newRemainingTime = state.remainingTime - deltaTime;
  
  if (newRemainingTime <= 0) {
    return deactivateStarPower(state);
  }
  
  // Drain meter while active
  const drainAmount = (deltaTime / 1000) * STAR_POWER_CONFIG.drainRate;
  const newMeter = Math.max(0, state.meter - drainAmount);
  
  if (newMeter <= 0) {
    return deactivateStarPower(state);
  }
  
  return {
    ...state,
    remainingTime: newRemainingTime,
    meter: newMeter,
  };
}

export function getStarPowerChargeFromNote(
  isGolden: boolean,
  isPerfect: boolean,
  isGood: boolean,
  combo: number
): number {
  let charge = 0;
  
  if (isGolden) {
    charge += STAR_POWER_CONFIG.goldenNoteCharge;
  }
  if (isPerfect) {
    charge += STAR_POWER_CONFIG.perfectCharge;
  } else if (isGood) {
    charge += STAR_POWER_CONFIG.goodCharge;
  }
  
  // Combo bonus
  charge += combo * STAR_POWER_CONFIG.comboBonus;
  
  return charge;
}

// Visual effects helpers
export function getStarPowerGlow(isActive: boolean): string {
  if (!isActive) return 'none';
  return '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)';
}

export function getStarPowerFilter(isActive: boolean): string {
  if (!isActive) return 'none';
  return 'brightness(1.2) saturate(1.3)';
}

export function getStarPowerAnimation(isActive: boolean): string {
  if (!isActive) return 'none';
  return 'pulse 0.5s ease-in-out infinite';
}
