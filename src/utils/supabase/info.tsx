/**
 * Supabase Configuration
 * 
 * These values are read from environment variables.
 * Set them in your .env file (see .env.example for reference).
 */

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validation helper
export function isSupabaseConfigured(): boolean {
    return !!(projectId && publicAnonKey);
}