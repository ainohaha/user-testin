/**
 * Application Configuration
 * 
 * This file centralizes all configuration options for the usability testing app.
 * Values are read from environment variables with sensible defaults.
 */

export const config = {
  // Test metadata
  testTitle: import.meta.env.VITE_TEST_TITLE || 'Usability Test',

  // Prototype URL (Figma embed URL or other prototype)
  prototypeUrl: import.meta.env.VITE_PROTOTYPE_URL || '',

  // Feature flags
  features: {
    aiAnalysis: import.meta.env.VITE_ENABLE_AI_ANALYSIS !== 'false',
    screenRecording: import.meta.env.VITE_ENABLE_SCREEN_RECORDING !== 'false',
  },

  // Admin configuration
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || '',

  // Supabase configuration
  supabase: {
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // Theme customization configuration
  theme: {
    defaultMode: (import.meta.env.VITE_DEFAULT_THEME_MODE as 'light' | 'dark') || 'light',
    allowCustomization: import.meta.env.VITE_ALLOW_THEME_CUSTOMIZATION !== 'false',
  }
};

// Validation helper
export function isConfigured(): boolean {
  return !!(config.supabase.projectId && config.supabase.anonKey);
}

export function getConfigWarnings(): string[] {
  const warnings: string[] = [];

  if (!config.supabase.projectId || !config.supabase.anonKey) {
    warnings.push('Supabase is not configured. Data will not be saved.');
  }

  if (!config.adminPassword) {
    warnings.push('Admin password is not set. Using default password.');
  }

  return warnings;
}
