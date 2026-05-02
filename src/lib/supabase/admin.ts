import { createClient } from '@supabase/supabase-js'

// Service-role client — never expose to the browser.
// Only import this in Server Components, Server Actions, or API Routes.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
