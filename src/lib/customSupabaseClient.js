import { createClient } from '@supabase/supabase-js';

// Load Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yjskofrahipwryyhsxrc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqc2tvZnJhaGlwd3J5eWhzeHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MzMwNjQsImV4cCI6MjA2ODEwOTA2NH0.Y2exoBbm23PQ-PboPhWzZ6bJerAl1NbGDe4fD9GGBac';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && 
         supabaseUrl !== 'https://your-project-id.supabase.co' &&
         supabaseAnonKey !== 'your-anon-key-here';
};