// Auth Configuration
// Centralized configuration for NextAuth.js with OAuth providers

export const authConfig = {
  // OAuth Providers Configuration
  providers: {
    google: {
      name: 'Google',
      clientIdEnv: 'GOOGLE_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
      enabled: true,
    },
    github: {
      name: 'GitHub',
      clientIdEnv: 'GITHUB_CLIENT_ID',
      clientSecretEnv: 'GITHUB_CLIENT_SECRET',
      enabled: true,
    },
    discord: {
      name: 'Discord',
      clientIdEnv: 'DISCORD_CLIENT_ID',
      clientSecretEnv: 'DISCORD_CLIENT_SECRET',
      enabled: true,
    },
    twitch: {
      name: 'Twitch',
      clientIdEnv: 'TWITCH_CLIENT_ID',
      clientSecretEnv: 'TWITCH_CLIENT_SECRET',
      enabled: true,
    },
    twitter: {
      name: 'Twitter/X',
      clientIdEnv: 'TWITTER_CLIENT_ID',
      clientSecretEnv: 'TWITTER_CLIENT_SECRET',
      enabled: true,
    },
    microsoft: {
      name: 'Microsoft',
      clientIdEnv: 'MICROSOFT_CLIENT_ID',
      clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
      enabled: true,
    },
    apple: {
      name: 'Apple',
      clientIdEnv: 'APPLE_CLIENT_ID',
      clientSecretEnv: 'APPLE_CLIENT_SECRET',
      enabled: false, // Requires paid Apple Developer account
    },
  },

  // Email/Password settings
  email: {
    enabled: true,
    requireVerification: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },

  // Session settings
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Cloud sync settings
  sync: {
    enabled: true,
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    conflictResolution: 'server-wins', // 'server-wins', 'client-wins', 'merge'
  },
};

// Get enabled OAuth providers
export function getEnabledProviders(): string[] {
  return Object.entries(authConfig.providers)
    .filter(([, config]) => config.enabled)
    .map(([key]) => key);
}

// Check if a provider is enabled
export function isProviderEnabled(provider: string): boolean {
  const config = authConfig.providers[provider as keyof typeof authConfig.providers];
  return config?.enabled ?? false;
}

// Validate password against requirements
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { minLength, requireUppercase, requireLowercase, requireNumber, requireSpecialChar } = authConfig.password;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export default authConfig;
