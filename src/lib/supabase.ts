import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build time — routes will fail gracefully at runtime
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Client-side Supabase instance
export const supabase = createSupabaseClient();

// Server-side Supabase instance with service role key
export function createServerSupabase() {
  if (!supabaseUrl) {
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      { auth: { persistSession: false } }
    );
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    { auth: { persistSession: false } }
  );
}
