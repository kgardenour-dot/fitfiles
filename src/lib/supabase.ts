import { createClient } from '@supabase/supabase-js';
import { chunkedSecureStoreAdapter } from './secure-store-adapter';

// Inlined at bundle time. Local: .env. TestFlight/App Store: set on EAS (Project → Environment variables
// or eas env:create) for the production environment — a gitignored .env is not used on EAS Build.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'your-anon-key';

/** False when build-time env was missing and placeholder fallbacks are still in the bundle. */
export const isSupabaseConfigured =
  !SUPABASE_URL.includes('your-project.supabase.co') && SUPABASE_ANON_KEY !== 'your-anon-key';

export { SUPABASE_URL };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chunkedSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
