// Loaded after supabase-config.js and the Supabase CDN script.
// Exposes a single shared client as window.supabaseClient
window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
