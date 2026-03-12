import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

export const isSupabaseConfigured =
  !!supabaseUrl && supabaseUrl !== "your_supabase_url";

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

export function createServerSupabase() {
  if (!isSupabaseConfigured) {
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY, {
      auth: { persistSession: false },
    });
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    { auth: { persistSession: false } }
  );
}
