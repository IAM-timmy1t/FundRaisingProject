// Re-export the supabase client from lib
export { supabase } from '../lib/customSupabaseClient';

// You can also export additional supabase-related configurations here if needed
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY; 