import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only reads/writes that bypass RLS.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
