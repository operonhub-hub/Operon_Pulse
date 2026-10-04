import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a privileged, server-only Supabase Admin client using the Service Role Key.
 *
 * CRITICAL SECURITY INVARIANTS:
 * - This file MUST ONLY be imported in server-side files (Server Actions / Route Handlers).
 * - SUPABASE_SERVICE_ROLE_KEY is NEVER exposed to client components or browser bundles.
 * - All calls to this client MUST be guarded by strict server-side ADMIN role checks.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
