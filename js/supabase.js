import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.SUPABASE_CONFIG || {};
const supabaseUrl = config.url || "";
const supabaseAnonKey = config.anonKey || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase is not configured. Set window.SUPABASE_CONFIG.url and window.SUPABASE_CONFIG.anonKey before loading this file."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
