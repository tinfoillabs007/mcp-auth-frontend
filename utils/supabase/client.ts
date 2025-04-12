/**
 * Supabase client configured for client components (browser-side).
 */
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase' // Assuming you have types generated

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
