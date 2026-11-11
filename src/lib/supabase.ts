import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The website reads these two values from Vercel's Environment Variables
// (Settings > Environment Variables). They are set by the owner in the
// Vercel dashboard — never typed into this code, and never sent in chat.
// Only the public "anon" key belongs here. Never use service_role.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    // Placeholder values keep the build working even before the real
    // values are entered; the site shows a friendly setup message instead.
    client = createClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key"
    );
  }
  return client;
}
