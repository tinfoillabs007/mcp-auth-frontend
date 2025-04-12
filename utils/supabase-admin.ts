import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!, // Add this to .env.local
  { 
    auth: { 
      persistSession: false 
    } 
  }
);
