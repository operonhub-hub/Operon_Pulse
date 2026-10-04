import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-side Supabase client.
 * Returns null gracefully if environment variables are not configured.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Graceful fallback for Phase 1 when environment variables are not set
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
